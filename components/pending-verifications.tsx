"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, ClipboardCheck, AlertCircle } from "lucide-react"
import { generateMockVerifications } from "@/lib/constants"
import { PRIORITY_COLORS, PRIORITY_LABELS } from "@/lib/constants"
import { VerificationDetailDialog } from "./verification-detail-dialog"
import type { PendingVerification } from "@/lib/types"
import { loadProductsFromChain } from "@/app/lib/loadProducts"
import { ethers } from "ethers"
import localBuild from "@/app/lib/abi/__local__.json"

export function PendingVerifications() {
  const [searchTerm, setSearchTerm] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [selectedProduct, setSelectedProduct] = useState<PendingVerification | null>(null)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const products = await loadProductsFromChain({
          rpcUrl: process.env.NEXT_PUBLIC_RPC_URL,
          registryAddress: process.env.NEXT_PUBLIC_REGISTRY_ADDR,
          fromBlock: Number(process.env.NEXT_PUBLIC_FROM_BLOCK || 0),
        })

        if (!mounted) return

        const mapped = products.map((p: any) => {
          const metadata = p.metadata || {}
          const eventsArray = p.events || p.raw?.events || []
          return {
            pid: p.pid,
            metadata,
            events: eventsArray,
            events_count: p.events_count ?? p.raw?.events_count ?? 0,
            raw: p,
          }
        })

        // enrich latest event by calling contract if events array missing
        function pidToBytes32(pid: string) {
          const enc = new TextEncoder()
          const b = enc.encode(pid)
          const out = new Uint8Array(32)
          if (b.length >= 32) out.set(b.slice(0, 32))
          else out.set(b)
          return "0x" + Array.from(out).map((x) => x.toString(16).padStart(2, "0")).join("")
        }

      async function enrichWithLatestEventsLocal(itemsToEnrich: any[]) {
        try {
          const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL!
          const registryAddress = process.env.NEXT_PUBLIC_REGISTRY_ADDR!
          const provider = new ethers.JsonRpcProvider(rpcUrl)

          const registryAbi =
            localBuild.contracts?.ProvenanceRegistry?.abi ||
            localBuild.contracts?.["ProvenanceRegistry.vy"]?.abi ||
            localBuild.abi ||
            (localBuild.contractTypes && Object.values(localBuild.contractTypes)[0]?.abi)

          if (!registryAbi) return itemsToEnrich

          const registry = new ethers.Contract(registryAddress, registryAbi, provider)

          const promises = itemsToEnrich.map(async (it: any) => {
            try {
              // default flags
              it.verifiedOnChain = false
              it.latestEvent = it.latestEvent ?? null

              // compute pidHex
              const pidHex = pidToBytes32(it.pid)

              // 1) check verification status on-chain (0 none, 1 passed, 2 failed)
              const vs = await registry.get_verification_status(pidHex).catch(() => null)
              const verificationStatus = Number(vs ?? 0)
              it.verifiedOnChain = verificationStatus === 1

              // 2) if not verified, read last event to show latestEvent (if no events present)
              if (!it.verifiedOnChain) {
                const cntBN = await registry.get_events_count(pidHex).catch(() => null)
                const cnt = Number(cntBN ?? 0)
                if (cnt > 0) {
                  const lastIdx = cnt - 1
                  const ev = await registry.get_event(pidHex, lastIdx)
                  // ev: (actor, action, data_cid, timestamp)
                  const actionRaw = typeof ev[1] === "string" ? ev[1] : ethers.hexlify(ev[1])
                  let action = actionRaw
                  try { action = (ethers as any).toUtf8String(actionRaw).replace(/\0+$/g, "") } catch {}
                  const actor = ev[0]
                  const ts = Number(ev[3] ?? 0)
                  it.latestEvent = { idx: lastIdx, action, actor, timestamp: ts }
                  it.events_count = cnt
                }
              } else {
                // optionally fetch verification CID for UI if needed
                const vc = await registry.get_verification(pidHex).catch(() => null)
                if (vc) {
                  try {
                    const hex = typeof vc === "string" ? vc : ethers.hexlify(vc)
                    const txt = Buffer.from((hex.startsWith("0x")?hex.slice(2):hex), "hex").toString("utf8").replace(/\0+$/g, "")
                    it.verificationCid = txt.replace(/^ipfs:\/\//, "")
                  } catch {}
                }
              }

              return it
            } catch (e) {
              console.warn("enrich item failed", it.pid, e)
              return it
            }
          })

          const results = await Promise.all(promises)
          return results
        } catch (e) {
          console.warn("enrichWithLatestEventsLocal failed", e)
          return itemsToEnrich
        }
      }


        const enriched = await enrichWithLatestEventsLocal(mapped)
        if (!mounted) return
        setItems(enriched)
      } catch (e: any) {
        console.warn("Load from chain failed, fallback to mock:", e)
        setError(String(e?.message ?? e))
        const mock = generateMockVerifications()
        if (mounted) setItems(mock)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [])

  function isQualityAction(actionRaw?: string) {
    if (!actionRaw) return false
    const a = String(actionRaw).toLowerCase()
    return a.includes("quality") || a.includes("qc") || a.includes("inspection") || a.includes("quality-check")
      || a.includes("quality check") || a.includes("verify") || a.includes("verification")
  }
  function handleVerified(productId: string) {
    // productId có thể nằm ở metadata.product_id hoặc ở item.pid
    setItems((prev) =>
      prev.filter((it) => {
        const id1 = String(it.metadata?.product_id ?? "").toLowerCase()
        const id2 = String(it.pid ?? "").toLowerCase()
        return id1 !== String(productId).toLowerCase() && id2 !== String(productId).toLowerCase()
      })
    )

    // nếu bạn muốn đồng thời đóng dialog:
    setSelectedProduct(null)

    // Optionally: nếu muốn reload toàn bộ từ chain thay vì filter local:
    // await load()  <-- cần refactor load() thành function ngoài useEffect để gọi lại
  }

  const qualified = items
    .map((item) => {
      const evs = Array.isArray(item.events) ? item.events.slice() : []
      if (evs.length > 0) {
        evs.sort((a: any, b: any) => {
          const ta = Number(a.timestamp ?? a.time ?? 0)
          const tb = Number(b.timestamp ?? b.time ?? 0)
          return ta - tb
        })
      }
      const latest = evs.length > 0 ? evs[evs.length - 1] : item.latestEvent ?? null

      const meta = item.metadata || {}
      const metaFlag = (meta.status && String(meta.status).toLowerCase().includes("quality")) || meta.submitted_for_verification

      // <-- QUAN TRỌNG: nếu đã verified trên chain thì không pending
      const alreadyVerified = !!item.verifiedOnChain

      const latestIsQuality = !!(latest && isQualityAction(latest.action || latest.type || latest.description))

      return {
        ...item,
        latestEvent: latest,
        isPending: !alreadyVerified && (latestIsQuality || metaFlag),
      }
    })
    .filter((it) => it.isPending)
    .filter((it) => priorityFilter === "all" || (it.metadata?.priority ?? "medium") === priorityFilter)
    .filter((it) => {
      const q = searchTerm.trim().toLowerCase()
      if (!q) return true
      const m = it.metadata || {}
      return (
        String(m.product_id ?? it.pid ?? "").toLowerCase().includes(q) ||
        String(m.name ?? "").toLowerCase().includes(q) ||
        String(m.farm ?? "").toLowerCase().includes(q)
      )
    })

  return (
    <>
      <Card className="border-border bg-card">
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardCheck className="size-5" />
            <h2 className="text-2xl font-semibold text-foreground">Pending Verifications</h2>
          </div>
          <p className="text-sm text-muted-foreground">Review and verify product quality submissions</p>

          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, product ID, farm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="medium">Medium Priority</SelectItem>
                <SelectItem value="low">Low Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200">
                <TableHead>Product ID</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Farm</TableHead>
                <TableHead>Harvest Date</TableHead>
                <TableHead>Batch Number</TableHead>
                <TableHead>Submitted Date</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow className="border-gray-200">
                  <TableCell colSpan={8} className="h-24 text-center">Loading...</TableCell>
                </TableRow>
              ) : qualified.length === 0 ? (
                <TableRow className="border-gray-200">
                  <TableCell colSpan={8} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <AlertCircle className="size-8" />
                      <p>No pending verifications found</p>
                      {error && <p className="text-sm text-destructive">{error}</p>}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                qualified.map((item: any) => {
                  const meta = item.metadata || {}
                  const latest = item.latestEvent
                  const priority = meta.priority ?? "medium"
                  return (
                    <TableRow key={item.pid ?? meta.product_id} className="border-gray-200">
                      <TableCell className="font-mono text-sm">{meta.product_id ?? item.pid}</TableCell>
                      <TableCell className="font-medium">{meta.name ?? "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="size-2 rounded-full bg-primary" />
                          {meta.farm ?? "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <span>📅</span>
                          {meta.harvest_date ?? "-"}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{meta.batch_number ?? "-"}</TableCell>
                      <TableCell className="text-sm">
                        {latest?.timestamp ? new Date(Number(latest.timestamp) * 1000).toISOString().slice(0,10) : (meta.submitted_date ?? "-")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={PRIORITY_COLORS[priority]}>
                          {PRIORITY_LABELS[priority]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setSelectedProduct({
                            id: meta.product_id ?? item.pid,
                            metadata: meta,
                            metadataCID: meta?.metadataCID ?? meta?.cid,
                            owner: item.raw?.owner ?? meta?.owner,
                            events: item.events ?? []
                          } as any)}>
                            <ClipboardCheck className="size-4 mr-2" />
                            Verify
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <VerificationDetailDialog
        product={selectedProduct}
        open={!!selectedProduct}
        onOpenChange={(open) => {
          if (!open) setSelectedProduct(null)
        }}
        onVerified={(pid) => {
          handleVerified(pid)
        }}
      />



    </>
  )
}
