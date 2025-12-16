// components/product-detail.tsx
"use client"

import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, QrCode, Download, Plus, Package, MapPin, Clock, User, ImageIcon } from "lucide-react"
import { AddEventDialog } from "@/components/add-event-dialog"
import { QRCodeDialog } from "@/components/qr-code-dialog"
import { ethers } from "ethers"

interface ProductDetailProps {
  productId: string
  onBack: () => void
}

type EventItem = {
  idx: number
  action: string
  actor: string
  dataCid?: string
  timestamp?: number
}

// shape that your UI expects
type ProductUI = {
  product_id: string
  name: string
  farm: string
  harvest_date?: string
  batch_number?: string
  status?: string
  createdAt?: string
  metadataCID?: string
  photos: string[]
  description?: string
  events: Array<{
    id: string
    type: string
    description: string
    location?: string
    timestamp: string
    operator?: string
    metadata?: any
  }>
  owner?: string
}

export function ProductDetail({ productId, onBack }: ProductDetailProps) {
  const [isAddEventOpen, setIsAddEventOpen] = useState(false)
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [productData, setProductData] = useState<ProductUI | null>(null)

  // helpers
  function productIdToBytes32Hex(id: string) {
    const enc = new TextEncoder()
    const b = enc.encode(id)
    const out = new Uint8Array(32)
    if (b.length >= 32) out.set(b.slice(0, 32))
    else out.set(b)
    return "0x" + Array.from(out).map((x) => x.toString(16).padStart(2, "0")).join("")
  }

  function hexToUtf8Safe(hex: string) {
    if (!hex) return ""
    try {
      if ((ethers as any).toUtf8String) {
        return (ethers as any).toUtf8String(hex).replace(/\0+$/g, "")
      }
    } catch {}
    const h = hex.startsWith("0x") ? hex.slice(2) : hex
    try {
      const buf = Buffer.from(h, "hex")
      return buf.toString("utf8").replace(/\0+$/g, "")
    } catch {
      return ""
    }
  }

  // attempt to get registry ABI from bundled JSONs
  // ensure you have either __local__.json or ProvenanceRegistry.json in app/lib/abi
  function findRegistryAbi(): any | null {
    try {
      // try __local__.json (bundled artifact)
      // @ts-ignore
      const localBuild = require("@/app/lib/abi/__local__.json")
      const abi =
        localBuild.contracts?.ProvenanceRegistry?.abi ||
        localBuild.contracts?.["ProvenanceRegistry.vy"]?.abi ||
        localBuild.abi ||
        (localBuild.contractTypes && Object.values(localBuild.contractTypes)[0]?.abi)
      if (abi) return abi
    } catch {}
    try {
      // try explicit ProvenanceRegistry.json (structure { "abi": [...] })
      // @ts-ignore
      const reg = require("@/lib/abi/ProvenanceRegistry.json")
      return reg.abi ?? reg
    } catch {}
    return null
  }

  async function loadFromChain(pid: string) {
    setLoading(true)
    setError(null)
    setProductData(null)


    try {
      const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL
      const registryAddress = process.env.NEXT_PUBLIC_REGISTRY_ADDR
      if (!rpcUrl || !registryAddress) throw new Error("Missing NEXT_PUBLIC_RPC_URL or NEXT_PUBLIC_REGISTRY_ADDR")

      const registryAbi = findRegistryAbi()
      if (!registryAbi) throw new Error("ABI not found. Add app/lib/abi/__local__.json or ProvenanceRegistry.json")

      const provider = new ethers.JsonRpcProvider(rpcUrl)
      const registry = new ethers.Contract(registryAddress, registryAbi, provider)
      

      const pidBytes = productIdToBytes32Hex(pid)

      // fetch on-chain product
      const gp = await registry.get_product(pidBytes)
      const exists = Boolean(gp && gp[0])
      if (!exists) {
        throw new Error("Product not found on-chain")
      }

      // decode metadata CID stored on-chain (Bytes[128] or hex)
      let metadataCid = ""
      try {
        const raw = gp[2]
        const hex = typeof raw === "string" ? raw : ethers.hexlify(raw)
        metadataCid = hexToUtf8Safe(hex).replace(/^ipfs:\/\//, "")
      } catch {}

      // fetch metadata JSON from IPFS (Pinata gateway)
      let metadataJson: any = null
      if (metadataCid) {
        try {
          const res = await fetch(`https://gateway.pinata.cloud/ipfs/${metadataCid}`)
          if (res.ok) metadataJson = await res.json()
          else metadataJson = { error: `IPFS ${res.status}` }
        } catch (e) {
          metadataJson = { error: String(e) }
        }
      }

      // load events (get_events_count + get_event)
      const events: EventItem[] = []
      try {
        const cntBN = await registry.get_events_count(pidBytes)
        const cnt = Number(cntBN ?? 0)
        for (let i = 0; i < cnt; i++) {
          try {
            const ev = await registry.get_event(pidBytes, i)
            const actor = ev[0]
            const action = typeof ev[1] === "string" ? hexToUtf8Safe(ev[1]) : hexToUtf8Safe(ethers.hexlify(ev[1]))
            let dataCid = ""
            try {
              dataCid = hexToUtf8Safe(typeof ev[2] === "string" ? ev[2] : ethers.hexlify(ev[2]))
              dataCid = dataCid.replace(/^ipfs:\/\//, "")
            } catch {}
            const timestamp = ev[3] ? Number(ev[3]) : 0
            events.push({ idx: i, action, actor, dataCid: dataCid || undefined, timestamp })
          } catch (e) {
            // ignore per-event error
          }
        }
      } catch (e) {
        // ignore if view not available
      }
      let verificationStatusNum = 0
      let verificationCid = ""
      try {
        // get_verification_status(pidBytes) returns 0 none, 1 passed, 2 failed
        const vs = await registry.get_verification_status(pidBytes).catch(() => null)
        verificationStatusNum = Number(vs ?? 0)

        const vc = await registry.get_verification(pidBytes).catch(() => null)
        if (vc) {
          // vc may be bytes or hex; convert safe to utf8 string
          const hex = typeof vc === "string" ? vc : ethers.hexlify(vc)
          const txt = hexToUtf8Safe(hex).replace(/^ipfs:\/\//, "")
          verificationCid = txt
        }
      } catch (e) {
        // ignore if views not present
      }

      // map verificationStatusNum -> human status (prioritize chain verification over last event)
      let verificationStatusText = ""
      if (verificationStatusNum === 1) verificationStatusText = "verified"
      else if (verificationStatusNum === 2) verificationStatusText = "verification_failed"

      // If contract says verified, add a derived event at the end so UI timeline updates immediately.
      if (verificationStatusText) {
        // Only add fake event if last event isn't already a verified-like action
        const lastAction = events.length > 0 ? (events[events.length - 1].action || "").toLowerCase() : ""
        if (!lastAction.includes("verified") && !lastAction.includes("checked") && !lastAction.includes("verification")) {
          const nowTs = Math.floor(Date.now() / 1000)
          events.push({
            idx: events.length,
            action: verificationStatusText === "verified" ? "Verified" : "Verification Failed",
            actor: "", // optional: can't know who, unless from event logs
            dataCid: verificationCid || undefined,
            timestamp: nowTs,
          })
        }
      }
            // --- sort events by timestamp asc (older -> newer)
      events.sort((a, b) => {
        const ta = a.timestamp ?? 0;
        const tb = b.timestamp ?? 0;
        return ta - tb;
      });

      // map action string -> product status key (the keys you use in constants.ts)
      function mapActionToStatus(actionRaw: string | undefined): string {
        if (!actionRaw) return "created";
        const a = String(actionRaw).toLowerCase();

        // common mappings — chỉnh / mở rộng nếu bạn có actions khác
        if (a.includes("sold")) return "sold";
        if (a.includes("manufacturing")) return "manufacturing";
        if (a.includes("delivered") || a.includes("delivery")) return "delivered";
        if (a.includes("ship") || a.includes("shipped") || a.includes("shipping") || a.includes("in_transit")) return "in_transit";
        if (a.includes("package") || a.includes("packaging")) return "in_production"; // or other mapping you prefer
        if (a.includes("quality") || a.includes("Quality Check") || a.includes("inspection")) return "Quality Check";
        if (a.includes("received") || a.includes("receive")) return "in_stock";
        if (a.includes("production") || a.includes("harvest") || a.includes("manufacture")) return "in_production";

        // fallback — nếu không khớp, trả "updated" hoặc "created"
        return "updated";
      }

      // determine current status from the last event (if any)
      let currentStatus = metadataJson?.status || "created";
      if (verificationStatusText) {
        // nếu contract báo verified/failed thì ưu tiên hiển thị
        currentStatus = verificationStatusText === "verified" ? "verified" : "verification_failed";
      } else if (events.length > 0) {
        const latest = events[events.length - 1];
        const mapped = mapActionToStatus(latest.action);
        currentStatus = mapped;
      } // default from metadata nếu có
      

      // build UI product shape
      const ui: ProductUI = {
        product_id: pid,
        name: metadataJson?.name || pid,
        farm: metadataJson?.farm || metadataJson?.producer || "",
        harvest_date: metadataJson?.harvest_date || "",
        batch_number: metadataJson?.batch_number || metadataJson?.batch || "",
        status: currentStatus, // <-- gán status mới ở đây
        createdAt: metadataJson?.created_at || new Date().toISOString(),
        metadataCID: metadataCid || undefined,
        photos: Array.isArray(metadataJson?.photos) ? metadataJson.photos : metadataJson?.photos ? [metadataJson.photos] : [],
        description: metadataJson?.description || metadataJson?.note || "",
        events: events.map((ev) => ({
          id: String(ev.idx),
          type: ev.action || `Event ${ev.idx}`,
          description: ev.action || "",
          location: "", // optional
          timestamp: ev.timestamp ? new Date(ev.timestamp * 1000).toISOString() : "",
          operator: ev.actor,
          metadata: ev.dataCid ? { cid: ev.dataCid } : undefined,
        })),
        owner: gp[1],
      }

      setProductData(ui)
    } catch (err: any) {
      console.error("loadFromChain error:", err)
      setError(err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!productId) return
    loadFromChain(productId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-semibold text-foreground">{productData?.name ?? productId}</h1>
            <p className="text-sm text-muted-foreground">
              {productData?.product_id ?? productId} • {productData?.batch_number ?? "-"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 bg-transparent" onClick={() => setIsQRDialogOpen(true)} disabled={!productData}>
            <QrCode className="h-4 w-4" />
            Generate QR
          </Button>
          <Button variant="outline" className="gap-2 bg-transparent" disabled={!productData}>
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      {/* show loading / error */}
      {loading && <div className="text-sm text-muted-foreground">Loading product data from chain...</div>}
      {error && <div className="text-sm text-destructive">Error: {error}</div>}

      {/* Product Overview */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border bg-card p-6">
          <h2 className="mb-4 text-xl font-semibold text-foreground">Product Information</h2>
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Description</Label>
              <p className="mt-1 text-foreground">{productData?.description ?? "-"}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <Badge className="mt-1 bg-primary/10 text-primary border-primary/20">{productData?.status ?? "unknown"}</Badge>
              </div>
              <div>
                <Label className="text-muted-foreground">Farm</Label>
                <p className="mt-1 text-foreground">{productData?.farm ?? "-"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Harvest Date</Label>
                <p className="mt-1 text-foreground">{productData?.harvest_date ?? "-"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Batch Number</Label>
                <p className="mt-1 font-mono text-foreground">{productData?.batch_number ?? "-"}</p>
              </div>
            </div>

            {productData?.photos && productData.photos.length > 0 && (
            <div>
              <Label className="text-muted-foreground">Photos</Label>
              <div className="mt-2 flex gap-3 overflow-x-auto">
                {productData.photos.map((p, i) => {
                  // chuẩn hóa thành URL public (hỗ trợ ipfs://CID, bare CID, hoặc full URL)
                  let url = String(p || "");
                  if (url.startsWith("ipfs://")) {
                    url = `https://gateway.pinata.cloud/ipfs/${url.replace(/^ipfs:\/\//, "")}`;
                  } else if (/^[Qm1-9A-Za-z]{46,}$/i.test(url)) {
                    // nếu chỉ là CID (thường bắt đầu Qm...), băm sang gateway
                    url = `https://gateway.pinata.cloud/ipfs/${url}`;
                  }
                  // fallback: nếu không có protocol, giữ nguyên (có thể là https://... sẵn)
                  return (
                    <div key={i} className="w-28 h-28 flex-shrink-0 rounded overflow-hidden border border-border bg-background">
                      <img
                        src={url}
                        alt={`${productData.product_id}-photo-${i}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // fallback image khi không load được
                          (e.currentTarget as HTMLImageElement).src =
                            "/images/placeholder-image.png"; // thêm file placeholder vào public/
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            )}
          </div>
        </Card>

        <Card className="border-border bg-card p-6">
          <h2 className="mb-4 text-xl font-semibold text-foreground">Blockchain Data</h2>
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Metadata CID</Label>
              <p className="mt-1 break-all font-mono text-xs text-foreground">{productData?.metadataCID ?? "-"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Created Date</Label>
              <p className="mt-1 text-foreground">
                {productData?.createdAt ? new Date(productData.createdAt).toLocaleDateString("vi-VN", { year: "numeric", month: "long", day: "numeric" }) : "-"}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Total Events</Label>
              <p className="mt-1 text-2xl font-semibold text-foreground">{productData?.events.length ?? 0}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Owner</Label>
              <p className="mt-1 font-mono text-xs text-foreground">{productData?.owner ?? "-"}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Events Timeline */}
      <Card className="border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Product Events</h2>
          <Button onClick={() => setIsAddEventOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Event
          </Button>
        </div>

        <div className="space-y-4">
          {(productData?.events && productData.events.length > 0) ? (
            productData.events.map((event, index) => (
              <div key={event.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  {index < (productData.events.length - 1) && <div className="h-full w-px bg-border" />}
                </div>

                <Card className="mb-4 flex-1 border-border bg-background p-4">
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{event.type}</h3>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    </div>
                    <Badge variant="outline" className="border-primary/30 text-foreground">
                      {event.type}
                    </Badge>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {event.location || "-"}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {event.timestamp ? new Date(event.timestamp).toLocaleString("vi-VN") : "-"}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      {event.operator || event.metadata?.actor || event.operator || "-"}
                    </div>
                  </div>
                </Card>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground">No events found for this product.</div>
          )}
        </div>
      </Card>

      {/* Dialogs */}
      <AddEventDialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen} productId={productId} />
      <QRCodeDialog
        open={isQRDialogOpen}
        onOpenChange={setIsQRDialogOpen}
        productData={{
          id: productData?.product_id ?? productId,
          name: productData?.name ?? productId,
          batch: productData?.batch_number ?? "",
          metadataCID: productData?.metadataCID ?? "",
        }}
      />
    </div>
  )
}

function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <label className={`text-sm font-medium ${className}`}>{children}</label>
}
