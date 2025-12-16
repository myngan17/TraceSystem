"use client"

import React, { useState } from "react"
import { Search, QrCode, Shield, CheckCircle2, Leaf, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import ProductJourneyDialog from "./product-journey-dialog"
import type { Product } from "@/lib/types"
import { ethers } from "ethers"


export default function CustomerVerification() {
  const [productId, setProductId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [error, setError] = useState("")

  // helpers (tương tự product-detail)
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
      // ethers v6 global util
      // @ts-ignore
      if ((ethers as any).toUtf8String) {
        // @ts-ignore
        return (ethers as any).toUtf8String(hex).replace(/\0+$/g, "")
      }
    } catch {}
    try {
      const h = hex.startsWith("0x") ? hex.slice(2) : hex
      const buf = Buffer.from(h, "hex")
      return buf.toString("utf8").replace(/\0+$/g, "")
    } catch {
      return ""
    }
  }

  // tìm ABI giống product-detail (tìm __local__.json hoặc ProvenanceRegistry.json)
  function findRegistryAbi(): any | null {
    try {
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
      // @ts-ignore
      const reg = require("@/lib/abi/ProvenanceRegistry.json")
      return reg.abi ?? reg
    } catch {}
    return null
  }

  function mapActionToType(actionRaw: string | undefined) {
    if (!actionRaw) return "Event"
    const a = String(actionRaw).toLowerCase()
    if (a.includes("production") || a.includes("harvest") || a.includes("manufacture")) return "production"
    if (a.includes("quality") || a.includes("inspection") || a.includes("checked") || a.includes("verified")) return "quality_check"
    if (a.includes("package") || a.includes("packaging")) return "packaging"
    if (a.includes("ship") || a.includes("shipped") || a.includes("shipping") || a.includes("in_transit")) return "shipping"
    if (a.includes("received") || a.includes("receive")) return "received"
    if (a.includes("sold")) return "sold"
    return "Event"
  }

  function normalizeIpfsUrl(u: string | undefined): string | undefined {
    if (!u) return undefined
    const s = String(u).trim()
    if (!s) return undefined
    // already http(s)
    if (s.startsWith("http://") || s.startsWith("https://")) return s
    // ipfs://CID or ipfs://ipfs/CID
    if (s.startsWith("ipfs://")) {
      const cid = s.replace(/^ipfs:\/\//, "").replace(/^ipfs\/?/, "")
      return `https://gateway.pinata.cloud/ipfs/${cid}`
    }
    // bare CID (Qm..., bafy...)
    if (/^(Qm|bafy)[A-Za-z0-9]{40,}$/i.test(s)) {
      return `https://gateway.pinata.cloud/ipfs/${s}`
    }
    // sometimes metadata stores full gateway path without protocol
    if (s.startsWith("//")) return `https:${s}`
    // fallback: return as-is
    return s
  }

  const handleVerify = async () => {
    if (!productId.trim()) {
      setError("Vui lòng nhập Product ID")
      return
    }

    setIsLoading(true)
    setError("")
    setSelectedProduct(null)

    try {
      const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL
      const registryAddress = process.env.NEXT_PUBLIC_REGISTRY_ADDR
      if (!rpcUrl || !registryAddress) throw new Error("Thiếu NEXT_PUBLIC_RPC_URL hoặc NEXT_PUBLIC_REGISTRY_ADDR")

      const registryAbi = findRegistryAbi()
      if (!registryAbi) throw new Error("Không tìm thấy ABI contract (thêm __local__.json hoặc ProvenanceRegistry.json)")

      const provider = new ethers.JsonRpcProvider(rpcUrl)
      const registry = new ethers.Contract(registryAddress, registryAbi, provider)

      const pidBytes = productIdToBytes32Hex(productId)

      // 1) get_product (exists, owner, metadata_cid, events_count)
      const gp = await registry.get_product(pidBytes).catch(() => null)
      if (!gp || !gp[0]) throw new Error("Không tìm thấy product trên chain")

      // decode metadata CID (Bytes[128] hoặc hex)
      let metadataCid = ""
      try {
        const raw = gp[2]
        const hex = typeof raw === "string" ? raw : ethers.hexlify(raw)
        metadataCid = hexToUtf8Safe(hex).replace(/^ipfs:\/\//, "")
      } catch {}

      // 2) fetch metadata JSON từ IPFS (Pinata gateway)
      let metadataJson: any = {}
      if (metadataCid) {
        try {
          const res = await fetch(`https://gateway.pinata.cloud/ipfs/${metadataCid}`)
          if (res.ok) metadataJson = await res.json()
          else metadataJson = { error: `IPFS ${res.status}` }
        } catch (e) {
          metadataJson = { error: String(e) }
        }
      }

      // 3) load events list
      const events: any[] = []
      try {
        const cntBN = await registry.get_events_count(pidBytes).catch(() => null)
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

            // *** IMPORTANT: include report_cid if the event has a CID (so UI can show download) ***
            events.push({
              id: String(i),
              type: mapActionToType(action),
              description: action || "",
              location: "",
              timestamp: timestamp ? new Date(timestamp * 1000).toISOString() : "",
              actor,
              metadata: dataCid ? { cid: dataCid, report_cid: dataCid } : undefined,
            })
          } catch (e) {
            // ignore per-event error
          }
        }
      } catch (e) {
        // ignore if view not present
      }

      // 4) check verification status on-chain (priority)
      let verificationStatusNum = 0
      let verificationCid = ""
      try {
        const vs = await registry.get_verification_status(pidBytes).catch(() => null)
        verificationStatusNum = Number(vs ?? 0)
        const vc = await registry.get_verification(pidBytes).catch(() => null)
        if (vc) {
          const hex = typeof vc === "string" ? vc : ethers.hexlify(vc)
          verificationCid = hexToUtf8Safe(hex).replace(/^ipfs:\/\//, "")
        }
      } catch {}

      if (verificationStatusNum === 1) {
        // add derived verification event if not present
        const lastAction = events.length > 0 ? (events[events.length - 1].description || "").toLowerCase() : ""
        if (!lastAction.includes("verified") && !lastAction.includes("checked") && !lastAction.includes("verification")) {
          events.push({
            id: String(events.length),
            type: "quality_check",
            description: "Verified",
            location: "",
            timestamp: new Date().toISOString(),
            actor: "",
            // *** store report_cid explicitly so ProductJourneyDialog can show download ***
            metadata: verificationCid ? { report_cid: verificationCid } : undefined,
          })
        }
      } else if (verificationStatusNum === 2) {
        const lastAction = events.length > 0 ? (events[events.length - 1].description || "").toLowerCase() : ""
        if (!lastAction.includes("verification")) {
          events.push({
            id: String(events.length),
            type: "quality_check",
            description: "Verification Failed",
            location: "",
            timestamp: new Date().toISOString(),
            actor: "",
            metadata: verificationCid ? { report_cid: verificationCid } : undefined,
          })
        }
      }

      // sort events by timestamp asc (older -> newer)
      events.sort((a, b) => {
        const ta = a.timestamp ? Date.parse(a.timestamp) : 0
        const tb = b.timestamp ? Date.parse(b.timestamp) : 0
        return ta - tb
      })

      // determine status from last event / verification
      let status = metadataJson?.status || "created"
      if (verificationStatusNum === 1) status = "verified"
      else if (verificationStatusNum === 2) status = "verification_failed"
      else if (events.length > 0) {
        status = events[events.length - 1].type || status
      }

      // build photos array normalized
      const rawPhotos: string[] = Array.isArray(metadataJson?.photos)
        ? metadataJson.photos
        : metadataJson?.photos
        ? [metadataJson.photos]
        : []

      const photos = rawPhotos
        .map((p) => normalizeIpfsUrl(String(p)))
        .filter((x): x is string => !!x) // keep only defined strings

      // build Product shape (khớp với UI/dialog của bạn)
      const uiProduct: Product = {
        id: productId,
        metadata: {
          product_id: productId,
          name: metadataJson?.name || productId,
          farm: metadataJson?.farm || metadataJson?.producer || "",
          harvest_date: metadataJson?.harvest_date || "",
          batch_number: metadataJson?.batch_number || "",
          photos, // <-- dùng mảng đã chuẩn hoá
        },
        metadataCID: metadataCid || "",
        owner: gp[1] || "",
        status,
        events: events.map((ev) => ({
          id: ev.id,
          type: ev.type,
          description: ev.description,
          location: ev.location,
          timestamp: ev.timestamp,
          actor: ev.actor,
          metadata: ev.metadata,
        })),
        createdAt: metadataJson?.created_at || new Date().toISOString(),
        updatedAt: events.length ? events[events.length - 1].timestamp : new Date().toISOString(),
      }

      setSelectedProduct(uiProduct)
    } catch (err: any) {
      console.error("Verify error:", err)
      setError(err?.message || String(err))
    } finally {
      setIsLoading(false)
    }
  }

  const handleScanQR = () => {
    alert("QR Scanner would open here - using camera to scan product QR code")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-accent/5">
      <div className="relative text-primary-foreground overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src="/fresh-organic-farm-fields-with-vegetables.jpg"
            alt="Farm background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/80 to-primary/70" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />
        </div>

        <div className="container relative mx-auto px-4 py-8 md:py-12">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold mb-4 text-balance drop-shadow-lg">
              Verify Product Authenticity
            </h1>
            <p className="text-lg md:text-xl text-white/95 text-pretty leading-relaxed max-w-2xl drop-shadow-md">
              Track your product's journey from farm to table. Every step verified on blockchain for complete
              transparency and trust.
            </p>

            <Card className="mt-8 backdrop-blur-xl bg-white/95 dark:bg-background/95 shadow-2xl border-2 border-primary/40">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Search className="w-6 h-6 text-primary" />
                  Enter Product Information
                </CardTitle>
                <CardDescription className="text-base">
                  Scan the QR code on your product or manually enter the product ID
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Input
                      placeholder="Enter Product ID (e.g., LOT-20251123-001)"
                      value={productId}
                      onChange={(e) => {
                        setProductId(e.target.value)
                        setError("")
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                      className="h-14 text-base border-2 focus-visible:ring-4"
                    />
                  </div>
                  <Button
                    onClick={handleVerify}
                    disabled={isLoading}
                    size="lg"
                    className="px-8 h-14 text-base shadow-lg"
                  >
                    <Search className="w-5 h-5 mr-2" />
                    {isLoading ? "Verifying..." : "Verify"}
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t-2 border-primary/30" />
                  </div>
                  <div className="relative flex justify-center text-sm uppercase">
                    <span className="bg-background px-3 text-muted-foreground font-semibold">Or</span>
                  </div>
                </div>

                <Button
                  onClick={handleScanQR}
                  variant="outline"
                  size="lg"
                  className="w-full h-14 text-base border-2 border-primary/40 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors shadow-md bg-transparent"
                >
                  <QrCode className="w-5 h-5 mr-2" />
                  Scan QR Code with Camera
                </Button>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Verify Your Products?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Every product tells a story. See the complete journey and ensure authenticity with blockchain technology.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2 border-primary/40 hover:border-primary transition-all hover:shadow-lg group">
              <CardHeader>
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-primary/5 rounded-lg blur-xl group-hover:blur-2xl transition-all" />
                  <img
                    src="/blockchain-network-visualization-technology.jpg"
                    alt="Blockchain verification"
                    className="relative w-full h-40 object-cover rounded-lg"
                  />
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Blockchain Verified</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  All product information is immutably stored on blockchain, ensuring data cannot be tampered with or
                  falsified. Complete transparency guaranteed.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary/40 hover:border-primary transition-all hover:shadow-lg group">
              <CardHeader>
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-primary/5 rounded-lg blur-xl group-hover:blur-2xl transition-all" />
                  <img
                    src="/organic-farm-fresh-vegetables-growing-fields.jpg"
                    alt="Farm to table"
                    className="relative w-full h-40 object-cover rounded-lg"
                  />
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Leaf className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Farm to Table</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  See the complete journey from the farm where it was grown, through processing and distribution, all
                  the way to your table.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary/40 hover:border-primary transition-all hover:shadow-lg group">
              <CardHeader>
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-primary/5 rounded-lg blur-xl group-hover:blur-2xl transition-all" />
                  <img
                    src="/quality-inspection-certificate-checkmark-approval.jpg"
                    alt="Quality certified"
                    className="relative w-full h-40 object-cover rounded-lg"
                  />
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Quality Certified</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Access quality inspection reports and certifications from independent verifiers. Every product meets
                  strict quality standards.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {selectedProduct && (
        <ProductJourneyDialog
          product={selectedProduct}
          open={!!selectedProduct}
          onOpenChange={(open) => !open && setSelectedProduct(null)}
        />
      )}
    </div>
  )
}
