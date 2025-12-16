"use client"

import { Input } from "@/components/ui/input"
import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle2, XCircle, FileText, ImageIcon, Calendar, MapPin, Package } from "lucide-react"
import QRCode from "react-qr-code"
import { PRIORITY_COLORS, PRIORITY_LABELS } from "@/lib/constants"
import type { PendingVerification } from "@/lib/types"

import { ethers } from "ethers"
// import whole local build (could be __local__.json or ProvenanceRegistry.json)
import localBuild from "@/app/lib/abi/__local__.json"

interface VerificationDetailDialogProps {
  product: PendingVerification | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onVerified?: (productId: string) => void
}

export function VerificationDetailDialog({ product, open, onOpenChange, onVerified }: VerificationDetailDialogProps)  {
  const [reportFile, setReportFile] = useState<File | null>(null)
  const [notes, setNotes] = useState("")
  const [uploading, setUploading] = useState(false)
  const [pinCid, setPinCid] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  // role state + loading to avoid repeated RPC calls
  const [userRole, setUserRole] = useState<number | null>(null)
  const [roleLoading, setRoleLoading] = useState(false)

  

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReportFile(e.target.files[0])
    }
  }

  // product id -> bytes32 hex (phải trùng với cách bạn lưu trên chain)
  function productIdToBytes32Hex(id: string) {
    const enc = new TextEncoder()
    const b = enc.encode(id)
    const out = new Uint8Array(32)
    if (b.length >= 32) out.set(b.slice(0, 32))
    else out.set(b)
    return "0x" + Array.from(out).map((x) => x.toString(16).padStart(2, "0")).join("")
  }

  // read file -> data:<mime>;base64,...
  function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const fr = new FileReader()
      fr.onload = () => {
        if (typeof fr.result === "string") resolve(fr.result)
        else reject(new Error("FileReader result not string"))
      }
      fr.onerror = () => reject(fr.error)
      fr.readAsDataURL(file)
    })
  }

  // TRY to find ABI array from several common artifact shapes
  function findRegistryAbi(obj: any): any | null {
    if (!obj) return null
    if (Array.isArray(obj.abi)) return obj.abi

    if (obj.contracts && typeof obj.contracts === "object") {
      const tryNames = ["ProvenanceRegistry", "ProvenanceRegistry.vy", "ProvenanceRegistry.json", "provenanceregistry"]
      for (const name of tryNames) {
        if (obj.contracts[name] && Array.isArray(obj.contracts[name].abi)) return obj.contracts[name].abi
      }
      for (const k of Object.keys(obj.contracts)) {
        const entry = obj.contracts[k]
        if (entry && Array.isArray(entry.abi)) return entry.abi
      }
    }

    if (obj.contractTypes && typeof obj.contractTypes === "object") {
      for (const k of Object.keys(obj.contractTypes)) {
        const ct = obj.contractTypes[k]
        if (ct && Array.isArray(ct.abi)) return ct.abi
      }
    }

    for (const k of Object.keys(obj)) {
      const val = obj[k]
      if (val && Array.isArray(val.abi)) return val.abi
    }

    return null
  }

  // safeCall retry helper for "Too Many Requests"
  async function safeCall<T>(fn: () => Promise<T>, retries = 3, delayMs = 300): Promise<T> {
    try {
      return await fn()
    } catch (e: any) {
      const msg = String(e?.message || e)
      if (retries > 0 && (msg.includes("Too Many Requests") || msg.includes("rate limit") || msg.includes("429") || msg.includes("BAD_DATA"))) {
        await new Promise(r => setTimeout(r, delayMs))
        return safeCall(fn, retries - 1, Math.min(2000, Math.floor(delayMs * 1.5)))
      }
      throw e
    }
  }

  // load role once when dialog opens (use read RPC if provided)
  useEffect(() => {
    if (!open) return
    let mounted = true

    const loadRole = async () => {
      try {
        setRoleLoading(true)
        setUserRole(null)

        if (!(window as any).ethereum) {
          // no injected wallet -> can't determine role client-side
          if (mounted) setUserRole(null)
          return
        }

        await (window as any).ethereum.request({ method: "eth_requestAccounts" })
        const browserProvider = new ethers.BrowserProvider((window as any).ethereum)
        const signer = await browserProvider.getSigner()
        const addr = await signer.getAddress()

        const registryAddr = process.env.NEXT_PUBLIC_REGISTRY_ADDR
        if (!registryAddr) {
          console.warn("Missing NEXT_PUBLIC_REGISTRY_ADDR")
          if (mounted) setUserRole(null)
          return
        }

        const registryAbi = findRegistryAbi(localBuild)
        if (!registryAbi) {
          console.warn("ABI not found in __local__.json — roles check skipped")
          if (mounted) setUserRole(null)
          return
        }

        // prefer read-only provider (set NEXT_PUBLIC_READ_RPC to Ankr/Alchemy) to avoid rate limits
        let registryForRead: any
        const readRpc = process.env.NEXT_PUBLIC_RPC_URL
        if (readRpc) {
          const rprov = new (ethers as any).JsonRpcProvider(readRpc)
          registryForRead = new ethers.Contract(registryAddr, registryAbi, rprov)
        } else {
          registryForRead = new ethers.Contract(registryAddr, registryAbi, browserProvider)
        }

        const roleRaw: any = await safeCall(() => (registryForRead as any).roles(addr))
        const roleNum = typeof roleRaw === "bigint" ? Number(roleRaw) : Number(roleRaw?.toString?.() ?? roleRaw)
        if (mounted) setUserRole(Number.isFinite(roleNum) ? roleNum : null)
      } catch (err) {
        console.warn("Role load failed:", err)
        if (mounted) setUserRole(null)
      } finally {
        if (mounted) setRoleLoading(false)
      }
    }

    loadRole()
    return () => { mounted = false }
  }, [open])

  const handleVerify = async (passed: boolean) => {
    if (!reportFile) {
      alert("Vui lòng chọn file báo cáo trước khi verify.")
      return
    }

    // (1) nhanh: kiểm tra role client-side trước khi làm nặng (pin)
    const VERIFIER_CONST = 4
    if (roleLoading) {
      alert("Đang kiểm tra quyền, vui lòng thử lại trong giây lát.")
      return
    }
    if (userRole === null) {
      alert("Không xác định được role của bạn trên registry. Bạn có thể không phải VERIFIER.")
      return
    }
    if (userRole !== VERIFIER_CONST) {
      alert("Bạn không có quyền verifier (role mismatch).")
      return
    }

    setUploading(true)
    setPinCid(null)
    setTxHash(null)


    try {
      // 1) encode file -> data url
      const dataUrl = await fileToDataUrl(reportFile)

      // 2) pin to Pinata via your API
      const res = await fetch("/api/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: reportFile.name,
          fileData: dataUrl,
          pinataMetadata: { name: product.metadata.product_id ?? "report" },
        }),
      })

      if (!res.ok) {
        const txt = await res.text()
        throw new Error("Pin API lỗi: " + txt)
      }

      const jr = await res.json()
      const cid = jr.cid || jr.IpfsHash || (typeof jr.ipfsUrl === "string" ? jr.ipfsUrl.replace(/^ipfs:\/\//, "") : undefined)
      if (!cid) throw new Error("Không nhận được CID từ Pin API")
      setPinCid(cid)

      // 3) role check (use cached userRole)
      const VERIFIER_CONST = 4
      if (roleLoading) {
        throw new Error("Đang kiểm tra quyền, vui lòng thử lại trong giây lát.")
      }
      if (userRole === null) {
        throw new Error("Không xác định được role của bạn trên registry. Bạn có thể không phải VERIFIER.")
      }
      if (userRole !== VERIFIER_CONST) {
        throw new Error("Bạn không có quyền verifier (role mismatch).")
      }

      // 4) wallet + provider + signer (phải tạo trước khi truy vấn contract)
      if (!(window as any).ethereum) throw new Error("Không tìm thấy wallet (MetaMask). Vui lòng cài/enable MetaMask.")
      await (window as any).ethereum.request({ method: "eth_requestAccounts" })

      const provider = new ethers.BrowserProvider((window as any).ethereum)
      const signer = await provider.getSigner()

      const registryAddress = process.env.NEXT_PUBLIC_REGISTRY_ADDR
      if (!registryAddress) throw new Error("Missing NEXT_PUBLIC_REGISTRY_ADDR env")

      const registryAbi = findRegistryAbi(localBuild)
      if (!registryAbi) throw new Error("ABI not found in __local__.json — kiểm tra file ABI path / cấu trúc")

      const registry = new ethers.Contract(registryAddress, registryAbi, signer)

      const pidHex = productIdToBytes32Hex(product.metadata.product_id)
      const reportCidString = `ipfs://${cid}`

      // encode reportCidString -> BytesLike (Uint8Array) to match Bytes[128]
      let reportCidBytes: Uint8Array
      try {
        // @ts-ignore
        reportCidBytes = (ethers as any).toUtf8Bytes ? (ethers as any).toUtf8Bytes(reportCidString) : new TextEncoder().encode(reportCidString)
      } catch (e) {
        reportCidBytes = new TextEncoder().encode(reportCidString)
      }

      if (reportCidBytes.length > 128) {
        // safety: avoid sending >128 bytes (contract Bytes[128])
        throw new Error("Report CID quá dài cho Bytes[128] ( >128 bytes )")
      }

      // 5) call verify_product
      const tx = await (registry as any).verify_product(pidHex, reportCidBytes, passed)
      setTxHash(tx.hash ?? tx.transactionHash ?? null)
      const receipt = await tx.wait()
      setTxHash(receipt.transactionHash ?? receipt.transactionHash ?? null)

      // 6) optional: add_event "checked" (best-effort). NOTE: signer must have permission to add_event
      try {
        function actionToBytes32(s: string) {
          const enc = new TextEncoder()
          const b = enc.encode(s)
          const out = new Uint8Array(32)
          if (b.length >= 32) out.set(b.slice(0, 32))
          else out.set(b)
          return "0x" + Array.from(out).map(x => x.toString(16).padStart(2, "0")).join("")
        }
        const actionBytes32 = actionToBytes32("checked")
        const dataCidBytes = reportCidBytes
        const tx2 = await (registry as any).add_event(pidHex, actionBytes32, dataCidBytes).catch((e:any) => { throw e })
        if (tx2 && tx2.wait) await tx2.wait()
      } catch (e2) {
        console.warn("add_event (checked) skipped or failed:", e2)
      }

      // 7) Notify parent
      if (onVerified) onVerified(product.metadata.product_id)
      alert(`Verification ${passed ? "PASSED" : "FAILED"} — tx ${receipt.transactionHash}`)
      onOpenChange(false)
    } catch (err: any) {
      console.error("verify error", err)
      const msg = err?.reason || err?.message || String(err)
      alert("Lỗi khi verify: " + msg)
    } finally {
      setUploading(false)
    }
  }
  if (!product) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Product Verification</DialogTitle>
          <DialogDescription>Review product details and upload quality report</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Product Details</TabsTrigger>
            <TabsTrigger value="verification">Verification</TabsTrigger>
            <TabsTrigger value="qr">QR Code</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-muted-foreground">Product ID</Label>
                      <p className="font-mono text-lg">{product.metadata.product_id}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Product Name</Label>
                      <p className="text-lg font-semibold">{product.metadata.name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Priority</Label>
                      <div className="mt-1">
                        <Badge variant="outline" className={PRIORITY_COLORS[product.priority]}>
                          {PRIORITY_LABELS[product.priority]}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="size-5 text-muted-foreground mt-0.5" />
                      <div>
                        <Label className="text-muted-foreground">Farm</Label>
                        <p className="font-medium">{product.metadata.farm}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calendar className="size-5 text-muted-foreground mt-0.5" />
                      <div>
                        <Label className="text-muted-foreground">Harvest Date</Label>
                        <p className="font-medium">{product.metadata.harvest_date}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Package className="size-5 text-muted-foreground mt-0.5" />
                      <div>
                        <Label className="text-muted-foreground">Batch Number</Label>
                        <p className="font-medium font-mono">{product.metadata.batch_number}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {product.metadata.photos && product.metadata.photos.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <Label className="flex items-center gap-2 mb-3">
                    <ImageIcon className="size-4" />
                    Product Photos
                  </Label>
                  <div className="grid grid-cols-3 gap-4">
                    {product.metadata.photos.map((photo: string, index: number) => {
                      let u = String(photo || "")
                      if (u.startsWith("ipfs://")) u = `https://gateway.pinata.cloud/ipfs/${u.replace(/^ipfs:\/\//, "")}`
                      else if (/^[A-Za-z0-9]{40,}$/i.test(u)) u = `https://gateway.pinata.cloud/ipfs/${u}`
                      return (
                        <div key={index} className="aspect-square rounded-lg overflow-hidden bg-muted">
                          <img
                            src={u}
                            alt={`photo-${index}`}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/images/placeholder-image.png" }}
                          />
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="verification" className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label htmlFor="report-upload" className="flex items-center gap-2 mb-2">
                    <FileText className="size-4" />
                    Upload Quality Report (PDF, DOCX)
                  </Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="report-upload"
                      type="file"
                      accept=".pdf,.docx,.doc"
                      onChange={handleFileChange}
                      className="flex-1"
                    />
                    {reportFile && (
                      <Badge variant="outline" className="bg-chart-2/10 text-chart-2">
                        {reportFile.name}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Report will be uploaded to IPFS (Pinata) via /api/pin and then linked on-chain.
                  </p>

                  {uploading && <div className="text-sm text-muted-foreground mt-2">Uploading / submitting... please wait</div>}
                  {pinCid && <div className="text-sm mt-2">Pinned CID: <code className="font-mono">{pinCid}</code></div>}
                  {txHash && (
                    <div className="text-sm mt-1">
                      Tx: <a className="text-primary" target="_blank" rel="noreferrer" href={`${process.env.NEXT_PUBLIC_ETHERSCAN_BASE || "https://sepolia.etherscan.io"}/tx/${txHash}`}>{txHash}</a>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="notes">Verification Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add inspection notes, observations, or comments..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="mt-2"
                  />
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <Button
                    onClick={() => handleVerify(true)}
                    disabled={!reportFile || uploading || userRole !== 4}
                    className="flex-1 bg-chart-2 hover:bg-chart-2/90"
                  >
                    <CheckCircle2 className="size-4 mr-2" />
                    {uploading ? "Processing..." : "Pass Verification"}
                  </Button>
                  <Button
                    onClick={() => handleVerify(false)}
                    disabled={!reportFile || uploading || userRole !== 4}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="size-4 mr-2" />
                    {uploading ? "Processing..." : "Fail Verification"}
                  </Button>
                </div>

                {userRole !== 4 && (
                  <p className="text-sm text-red-500 mt-2">
                    Bạn không có quyền verifier — vui lòng đăng nhập bằng tài khoản đã được cấp role VERIFIER.
                  </p>
                )}

                <p className="text-sm text-muted-foreground text-center">
                  Verification result will be recorded on the blockchain and cannot be reversed
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="qr" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 bg-white rounded-lg">
                    <QRCode
                      value={`${process.env.NEXT_PUBLIC_VERIFY_BASE || "https://verify.example.com"}/product/${encodeURIComponent(product.metadata.product_id)}`}
                      size={200}
                    />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="font-medium">Product Verification QR Code</p>
                    <p className="text-sm text-muted-foreground">
                      Scan to view product details and verification status
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
