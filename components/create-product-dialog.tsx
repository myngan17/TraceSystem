"use client";

import React, { useState } from "react";
import type { ProductMetadata } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, ImageIcon } from "lucide-react";

import { connectWallet, getSigner } from "@/app/lib/eth";
import { getRegistry } from "@/app/lib/contracts";
import { ethers } from "ethers";

/**
 * CreateProductDialog with on-chain register + IPFS pin
 *
 * Assumptions:
 * - You have an API route POST /api/pin that returns { cid: "<IPFS_CID>" }
 * - getRegistry/getSigner implemented in app/lib
 */

interface CreateProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProductDialog({ open, onOpenChange }: CreateProductDialogProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [filesUploading, setFilesUploading] = useState(false);
  const [formData, setFormData] = useState<ProductMetadata>({
    product_id: "",
    name: "",
    farm: "",
    harvest_date: "",
    batch_number: "",
    photos: [],
  });
  const [photoInput, setPhotoInput] = useState("");
  const [msg, setMsg] = useState<string>(""); // trạng thái text cho user

/*  const handleAddPhoto = () => {
    if (photoInput.trim()) {
      setFormData({ ...formData, photos: [...formData.photos, photoInput.trim()] });
      setPhotoInput("");
    }
  };*/
    // state thêm
  const [userRole, setUserRole] = useState<number | null>(null)
  const [roleLoading, setRoleLoading] = useState(false)
  const MANUFACTURER_ROLE = 1

  // effect load role
  React.useEffect(() => {
    let mounted = true
    async function loadRole() {
      try {
        setRoleLoading(true)
        setUserRole(null)
        if (!(window as any).ethereum) {
          if (mounted) setUserRole(null)
          return
        }
        await (window as any).ethereum.request({ method: "eth_requestAccounts" })
        const provider = new ethers.BrowserProvider((window as any).ethereum)
        const signer = await provider.getSigner()
        const addr = await signer.getAddress()

        // get registry read contract (use provider or signer depending on your helper)
        let registryRead: any
        try {
          registryRead = getRegistry(provider) // try provider first
        } catch {
          registryRead = getRegistry(signer)   // fallback to signer
        }
        const roleRaw: any = await registryRead.roles(addr)
        const roleNum = typeof roleRaw === "bigint" ? Number(roleRaw) : Number(roleRaw?.toString?.() ?? roleRaw)
        if (mounted) setUserRole(Number.isFinite(roleNum) ? roleNum : null)
      } catch (err) {
        console.warn("loadRole failed", err)
        if (mounted) setUserRole(null)
      } finally {
        if (mounted) setRoleLoading(false)
      }
    }

    if (open) loadRole()
    return () => { mounted = false }
  }, [open])


  const handleRemovePhoto = (index: number) => {
    setFormData({ ...formData, photos: formData.photos.filter((_, i) => i !== index) });
  };
  
  // pin JSON metadata -> trả về CID (gọi serverless /api/pin)
  async function pinMetadataToIPFS(metadataObj: object): Promise<string> {
    const res = await fetch("/api/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metadataObject: metadataObj }),
    });

    const text = await res.text(); // luôn đọc raw text để debug
    let j: any = null;
    try {
      j = JSON.parse(text);
    } catch (err) {
      // response không phải JSON -> show raw for debug
      console.error("pin /api/pin returned non-JSON response:", text);
      throw new Error("Pin to IPFS failed: non-JSON response from server (check dev console)");
    }

    // giờ j là object
    if (!res.ok || !j.cid) {
      console.error("pin /api/pin returned error json:", j);
      throw new Error(j.error || j.message || "Pin to IPFS failed (no cid)");
    }

    return j.cid;
  }

  async function fileToBase64(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file); // returns data:<mime>;base64,...
  });
}

async function uploadFileToPinata(file: File): Promise<string> {
  // đọc file -> base64
  const base64 = await fileToBase64(file);

  // gọi serverless API - gửi JSON { fileName, fileData (base64) }
  const res = await fetch("/api/pin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      fileData: base64,
    }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j.error || "Pin file failed");
  // trả ipfs url (ipfs://CID)
  return j.url || `ipfs://${j.cid}`;
}

  // helpers độc lập, không cần ethers.utils
  function toHex(bytes: Uint8Array) {
    return "0x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * Tạo bytes32 (hex) từ chuỗi:
   * - encode UTF-8
   * - nếu >32 bytes thì cắt bớt (truncate) (không lỗi)
   * - nếu <32 bytes thì pad với 0x00 về phải (right-pad)
   * Trả về string hex có prefix 0x, dài 66 ký tự (0x + 64 hex chars)
   */
  function formatBytes32StringCompat(s: string): string {
    const enc = new TextEncoder();
    const b = enc.encode(s);
    let out = new Uint8Array(32);
    if (b.length >= 32) {
      // truncate to 32 bytes
      out.set(b.slice(0, 32));
    } else {
      // copy then right-pad (the contract will see zeros after)
      out.set(b);
      // remaining bytes already zero
    }
    return toHex(out);
  }

  /**
   * Chuyển chuỗi (ví dụ CID) sang hex bytes để truyền cho tham số Bytes[...] trong contract.
   * Trả về string hex bắt đầu bằng 0x. Không giới hạn length ở tầng JS,
   * nhưng contract có giới hạn Bytes[128] (128 bytes) — nếu CID dài hơn, contract sẽ revert.
   */
  function toUtf8BytesHex(s: string): string {
    const enc = new TextEncoder();
    const b = enc.encode(s); // Uint8Array
    return toHex(b);
  }

  async function onRegister(pidStr: string, metadataCid: string) {
    setMsg("");
    try {
      const r = await connectWallet();
      if (r.error || !r.signer) {
        setMsg("Kết nối ví thất bại: " + (r.error || "Không lấy được signer"));
        return;
      }
      
      const signer = r.signer;
      
      const registry = getRegistry(signer);

      // CHÚ Ý: dùng helper JS (không phụ thuộc ethers version)
      const pid = formatBytes32StringCompat(pidStr); // hex 0x...
      const cidHex = toUtf8BytesHex(metadataCid); // hex 0x...

      setMsg("Gửi transaction đăng ký lên blockchain...");
      // Gọi contract: truyền pid (bytes32) và metadata (bytes)
      // Tùy ABI của bạn, ape/ethers có thể chấp nhận hex strings.
      const tx = await registry.register_product(pid, cidHex, { gasLimit: 300000 });
      setMsg(`Tx sent: ${tx.hash} — chờ confirm...`);
      await tx.wait();
      setMsg(`Đăng ký thành công. Tx: ${tx.hash}`);
      return tx.hash;
    } catch (e: any) {
      console.error(e);
      setMsg("Lỗi khi register: " + (e?.message || e));
      throw e;
    }
  }


  // submit form: pin metadata -> call onRegister
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setMsg("");
    try {
      // build metadata JSON (thêm timestamp & owner placeholder nếu muốn)
      const metadata = {
        product_id: formData.product_id,
        name: formData.name,
        farm: formData.farm,
        harvest_date: formData.harvest_date,
        batch_number: formData.batch_number,
        photos: formData.photos,
        created_at: new Date().toISOString(),
      };

      setMsg("Đang upload metadata lên IPFS...");
      // gọi serverless pin
      const cid = await pinMetadataToIPFS(metadata);
      setMsg("IPFS CID: " + cid);

      // gọi on-chain
      await onRegister(formData.product_id, cid);

      setUploadSuccess(true);
      setTimeout(() => {
        setUploadSuccess(false);
        onOpenChange(false);
        // reset form
        setFormData({
          product_id: "",
          name: "",
          farm: "",
          harvest_date: "",
          batch_number: "",
          photos: [],
        });
        setMsg("");
      }, 2000);
    } catch (err: any) {
      // lỗi đã được show trong onRegister / pinMetadata
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">Create New Product Batch</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Upload product metadata to IPFS and register on blockchain
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="product_id" className="text-foreground">
                Product ID
              </Label>
              <Input
                id="product_id"
                placeholder="LOT-20251123-001"
                value={formData.product_id}
                onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                required
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch_number" className="text-foreground">
                Batch Number
              </Label>
              <Input
                id="batch_number"
                placeholder="BATCH-001"
                value={formData.batch_number}
                onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                required
                className="bg-background"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground">
              Product Name
            </Label>
            <Input
              id="name"
              placeholder="Thanh long ruột đỏ"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="farm" className="text-foreground">
              Farm/Producer
            </Label>
            <Input
              id="farm"
              placeholder="HTX Thanh Long A"
              value={formData.farm}
              onChange={(e) => setFormData({ ...formData, farm: e.target.value })}
              required
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="harvest_date" className="text-foreground">
              Harvest Date
            </Label>
            <Input
              id="harvest_date"
              type="date"
              value={formData.harvest_date}
              onChange={(e) => setFormData({ ...formData, harvest_date: e.target.value })}
              required
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="photos" className="text-foreground">
              Photos (IPFS URLs)
            </Label>
            <div className="flex gap-2">
              <input
                id="photo_file"
                type="file"
                accept="image/*,application/pdf"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    setFilesUploading(true);
                    const ipfsUrl = await uploadFileToPinata(f); // hàm bên dưới
                    // ipfsUrl như "ipfs://Qm..."
                    setFormData({ ...formData, photos: [...formData.photos, ipfsUrl] });
                  } catch (err) {
                    console.error(err);
                    setMsg("Upload file thất bại: " + (err as any).message);
                  } finally {
                    setFilesUploading(false);
                    // clear input
                    (e.target as HTMLInputElement).value = "";
                  }
                }}
              />


            </div>
            {formData.photos.length > 0 && (
              <div className="mt-3 space-y-2">
                {formData.photos.map((photo, index) => (
                  <div key={index} className="flex items-center gap-2 rounded-lg border border-border bg-background p-2">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate font-mono text-xs text-foreground">{photo}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleRemovePhoto(index)} className="h-7">
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Thông báo trạng thái */}
          {msg && <div className="text-sm text-foreground/90">{msg}</div>}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
              Cancel
            </Button>
            {!roleLoading && userRole !== null && userRole !== MANUFACTURER_ROLE && (
  <div className="text-sm text-amber-600">Bạn không có quyền tạo sản phẩm (chỉ Manufacturer được phép).</div>
)}

          <Button
            type="submit"
            disabled={
              isUploading ||
              roleLoading ||           // still checking role
              userRole === null ||     // unknown role (not connected)
              userRole !== MANUFACTURER_ROLE
            }
            className="min-w-[140px]"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : uploadSuccess ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Success!
              </>
            ) : (
              "Create Product"
            )}
          </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
