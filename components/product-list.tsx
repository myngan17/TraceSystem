// components/product-list.tsx
"use client";

import React, { useEffect, useState } from "react";
import { PRODUCT_STATUS_COLORS, PRODUCT_STATUS_LABELS } from "@/lib/constants";
import { loadProductsFromChain } from "@/app/lib/loadProducts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Download, QrCode } from "lucide-react";
import { QRCodeDialog } from "@/components/qr-code-dialog";
import { ethers } from "ethers";

interface ProductListProps {
  onProductSelect: (productId: string) => void;
}

export function ProductList({ onProductSelect }: ProductListProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductForQR, setSelectedProductForQR] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const data = await loadProductsFromChain({
          rpcUrl: process.env.NEXT_PUBLIC_RPC_URL,
          registryAddress: process.env.NEXT_PUBLIC_REGISTRY_ADDR,
          fromBlock: Number(process.env.NEXT_PUBLIC_FROM_BLOCK || 0),
        });

        if (!mounted) return;

        const mapped = (data || []).map((p: any) => ({
          id: p.pid || p.txHash,
          metadata: {
            product_id: p.pid,
            name: p.metadata?.name || p.pid,
            farm: p.metadata?.farm || "",
            harvest_date: p.metadata?.harvest_date || "",
            batch_number: p.metadata?.batch_number || "",
            photos: p.metadata?.photos || [],
          },
          status: p.metadata?.status || "ready",
          raw: p,
        }));

        setProducts(mapped);

        // now fetch latest status per-product from chain (async, non-blocking)
        for (const pr of mapped) {
          // don't await serially in main loop — spawn tasks
          fetchAndUpdateProductStatus(pr.id, mounted).catch((e) => {
            // log but continue
            console.warn("fetch status failed for", pr.id, e);
          });
        }
      } catch (e) {
        console.error("Load products failed:", e);
        setProducts([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // helper: create bytes32 hex from string (same as product-detail)
  function productIdToBytes32Hex(id: string) {
    const enc = new TextEncoder();
    const b = enc.encode(id);
    const out = new Uint8Array(32);
    if (b.length >= 32) out.set(b.slice(0, 32));
    else out.set(b);
    return "0x" + Array.from(out).map((x) => x.toString(16).padStart(2, "0")).join("");
  }

  // robust hex -> utf8 conversion used for action / cid decode
  function hexToUtf8Safe(hex: string) {
    if (!hex) return "";
    try {
      // ethers v6 top-level
      // @ts-ignore
      if (typeof (ethers as any).toUtf8String === "function") {
        try {
          // @ts-ignore
          return (ethers as any).toUtf8String(hex).replace(/\0+$/g, "");
        } catch {}
      }
      // ethers.utils (v5)
      // @ts-ignore
      if ((ethers as any).utils && typeof (ethers as any).utils.toUtf8String === "function") {
        try {
          // @ts-ignore
          return (ethers as any).utils.toUtf8String(hex).replace(/\0+$/g, "");
        } catch {}
      }
    } catch {}
    try {
      const h = hex.startsWith("0x") ? hex.slice(2) : hex;
      const buf = Buffer.from(h, "hex");
      return buf.toString("utf8").replace(/\0+$/g, "");
    } catch {
      return "";
    }
  }

  // try to find registry ABI same way as product-detail (bundled file)
  function findRegistryAbi(): any | null {
    try {
      // @ts-ignore
      const localBuild = require("@/app/lib/abi/__local__.json");
      const abi =
        localBuild.contracts?.ProvenanceRegistry?.abi ||
        localBuild.contracts?.["ProvenanceRegistry.vy"]?.abi ||
        localBuild.abi ||
        (localBuild.contractTypes && Object.values(localBuild.contractTypes)[0]?.abi);
      if (abi) return abi;
    } catch {}
    try {
      // @ts-ignore
      const reg = require("@/lib/abi/ProvenanceRegistry.json");
      return reg.abi ?? reg;
    } catch {}
    return null;
  }

  // map action text -> normalized status key (same rules as product-detail)
  function mapActionToStatus(actionRaw: string | undefined): string {
    if (!actionRaw) return "created";
    const a = String(actionRaw).toLowerCase();
    if (a.includes("sold")) return "sold";
    if (a.includes("manufacturing")) return "manufacturing";
    if (a.includes("delivered") || a.includes("delivery")) return "delivered";
    if (a.includes("ship") || a.includes("shipped") || a.includes("shipping") || a.includes("in_transit")) return "in_transit";
    if (a.includes("package") || a.includes("packaging") || a.includes("packed")) return "in_production";
    if (a.includes("quality") || a.includes("quality check") || a.includes("inspection") || a.includes("checked")) return "quality_check";
    if (a.includes("received") || a.includes("receive")) return "in_stock";
    if (a.includes("production") || a.includes("harvest") || a.includes("manufacture")) return "in_production";
    return "updated";
  }

  // fetch latest status for a single product and update state
  async function fetchAndUpdateProductStatus(pid: string, mountedFlag = true) {
    try {
      const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
      const registryAddress = process.env.NEXT_PUBLIC_REGISTRY_ADDR;
      if (!rpcUrl || !registryAddress) return;

      const registryAbi = findRegistryAbi();
      if (!registryAbi) return;

      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const registry = new ethers.Contract(registryAddress, registryAbi, provider);

      const pidBytes = productIdToBytes32Hex(pid);

      // Try to read events count
      let cnt = 0;
      try {
        const cntBN = await registry.get_events_count(pidBytes).catch(() => null);
        cnt = Number(cntBN ?? 0);
      } catch {
        cnt = 0;
      }

      let newStatus = "created";
      if (cnt > 0) {
        try {
          // fetch last event (idx = cnt-1)
          const ev = await registry.get_event(pidBytes, cnt - 1);
          // ev structure: (actor, action(bytes32), data_cid, timestamp)
          const actionRaw = typeof ev[1] === "string" ? hexToUtf8Safe(ev[1]) : hexToUtf8Safe(ethers.hexlify(ev[1]));
          newStatus = mapActionToStatus(actionRaw);
        } catch (e) {
          // fallback: keep created
        }
      } else {
        // no events -> check verification status
        try {
          const vs = await registry.get_verification_status(pidBytes).catch(() => null);
          const verificationStatusNum = Number(vs ?? 0);
          if (verificationStatusNum === 1) newStatus = "verified";
          else if (verificationStatusNum === 2) newStatus = "verification_failed";
          else newStatus = "created";
        } catch {
          newStatus = "created";
        }
      }

      // update products state (only if component still mounted)
      setProducts((prev) => {
        return prev.map((p) => {
          if (!p) return p;
          // we stored id as pid string earlier (p.id)
          if (String(p.id) === String(pid)) {
            return { ...p, status: newStatus };
          }
          return p;
        });
      });
    } catch (err) {
      // ignore single product failure
      // console.warn("status fetch error", pid, err);
    } finally {
      // no-op
    }
  }

  // filter
  const filtered = products.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.metadata.product_id || "").toLowerCase().includes(q) ||
      (p.metadata.name || "").toLowerCase().includes(q) ||
      (p.metadata.batch_number || "").toLowerCase().includes(q) ||
      (p.metadata.farm || "").toLowerCase().includes(q)
    );
  });

  function handleExportQR(product: any, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedProductForQR(product);
  }

  return (
    <>
      <Card className="border-border bg-card">
        <div className="border-b border-gray-200 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Product Catalog</h2>
              <p className="text-sm text-muted-foreground">Manage and track your product batches</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2 bg-transparent">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
              <Button variant="outline" className="gap-2 bg-transparent">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products, batches, or IDs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-gray-200">
                <TableHead className="text-foreground">Product ID</TableHead>
                <TableHead className="text-foreground">Product Name</TableHead>
                <TableHead className="text-foreground">Farm</TableHead>
                <TableHead className="text-foreground">Harvest Date</TableHead>
                <TableHead className="text-foreground">Batch Number</TableHead>
                <TableHead className="text-foreground">Status</TableHead>
                <TableHead className="text-right text-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product: any) => (
                <TableRow
                  key={product.id}
                  className="cursor-pointer border-b border-gray-200"
                  onClick={() => onProductSelect(product.id)}
                >
                  <TableCell className="font-mono text-sm text-foreground">{product.metadata.product_id}</TableCell>
                  <TableCell className="font-medium text-foreground">{product.metadata.name}</TableCell>
                  <TableCell className="text-muted-foreground">{product.metadata.farm}</TableCell>
                  <TableCell className="text-muted-foreground">{product.metadata.harvest_date}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {product.metadata.batch_number}
                  </TableCell>
                  <TableCell>
                    <Badge className={PRODUCT_STATUS_COLORS[product.status]}>
                      {PRODUCT_STATUS_LABELS[product.status] || product.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="gap-2" onClick={(e) => handleExportQR(product, e)}>
                      <QrCode className="h-4 w-4" />
                      QR
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="border-t border-gray-200 p-4">
          <p className="text-sm text-muted-foreground">
            Showing {products.length} of {products.length} products
          </p>
        </div>
      </Card>

      {selectedProductForQR && (
        <QRCodeDialog
          open={!!selectedProductForQR}
          onOpenChange={(open) => !open && setSelectedProductForQR(null)}
          productData={selectedProductForQR}
        />
      )}
    </>
  );
}
