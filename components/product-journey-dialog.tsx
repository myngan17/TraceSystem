"use client"

import { format } from "date-fns"
import {
  Calendar,
  MapPin,
  User,
  Package,
  FileText,
  ExternalLink,
  CheckCircle2,
  Factory,
  Truck,
  PackageCheck,
  ShoppingCart,
  Download,
  ImageIcon,
  Shield,
  Leaf,
  QrCode,
} from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Product, SupplyChainEvent } from "@/lib/types"
import { PRODUCT_STATUS_LABELS } from "@/lib/constants"
import QRCode from "react-qr-code"

interface ProductJourneyDialogProps {
  product: Product
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * NOTE:
 * - Use a Record<string, any> map and always fallback to a default icon to avoid undefined.
 * - Support event.type values that might not exactly match keys (so we lowercase).
 */
const EVENT_ICONS: Record<string, any> = {
  production: Factory,
  quality_check: CheckCircle2,
  packaging: Package,
  shipping: Truck,
  received: PackageCheck,
  sold: ShoppingCart,
  // additional aliases:
  verified: CheckCircle2,
  default: QrCode,
}

/** Helper: normalize a photo url (ipfs://, bare CID, or http(s) url) -> public gateway url */
function normalizePhotoUrl(p: string) {
  if (!p) return ""
  const s = String(p).trim()
  if (s.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${s.replace(/^ipfs:\/\//, "")}`
  // common bare CID (Qm... or bafy...)
  if (/^[A-Za-z0-9]{40,}$/i.test(s) || /^[Qm1-9A-Za-z]{46,}$/i.test(s)) return `https://ipfs.io/ipfs/${s}`
  // already a http(s) url
  if (s.startsWith("http://") || s.startsWith("https://")) return s
  // fallback: treat as path
  return s
}

/** Safe date formatting */
function safeFormatDate(d?: string | number) {
  try {
    const dt = d ? new Date(d) : null
    if (!dt || isNaN(dt.getTime())) return "-"
    return format(dt, "PPP")
  } catch {
    return "-"
  }
}

export default function ProductJourneyDialog({ product, open, onOpenChange }: ProductJourneyDialogProps) {
  const handleDownloadReport = (reportCID: string) => {
    if (!reportCID) return
    const url = reportCID.startsWith("ipfs://") ? reportCID.replace(/^ipfs:\/\//, "https://ipfs.io/ipfs/") : `https://ipfs.io/ipfs/${reportCID}`
    window.open(url, "_blank")
  }

  const handleViewImage = (photoUrl: string) => {
    const u = normalizePhotoUrl(photoUrl)
    if (!u) return
    window.open(u, "_blank")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl md:text-3xl">Product Journey</DialogTitle>
          <DialogDescription className="text-base">
            Complete traceability information verified on blockchain
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Product Info</TabsTrigger>
            <TabsTrigger value="journey">Supply Chain</TabsTrigger>
            <TabsTrigger value="verification">Verification</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-6 mt-6">
            <Card className="border-2">
              <CardHeader>
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Package className="w-7 h-7 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl mb-2">{product.metadata.name}</CardTitle>
                        <Badge variant="outline" className="font-normal">
                          {PRODUCT_STATUS_LABELS[product.status]}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Package className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div>
                          <div className="text-xs text-muted-foreground">Product ID</div>
                          <div className="font-mono text-sm font-semibold">{product.metadata.product_id}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div>
                          <div className="text-xs text-muted-foreground">Farm Origin</div>
                          <div className="text-sm font-semibold">{product.metadata.farm}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div>
                          <div className="text-xs text-muted-foreground">Harvest Date</div>
                          <div className="text-sm font-semibold">
                            {safeFormatDate(product.metadata.harvest_date)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div>
                          <div className="text-xs text-muted-foreground">Batch Number</div>
                          <div className="text-sm font-semibold">{product.metadata.batch_number}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-3">
                    <div className="bg-white p-4 rounded-xl border-2 shadow-sm">
                      <QRCode value={product.metadata.product_id} size={120} />
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">Product QR Code</p>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {product.metadata.photos && product.metadata.photos.length > 0 && (
              <Card className="border-2">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-primary" />
                    <CardTitle className="text-xl">Product Photos</CardTitle>
                  </div>
                  <p className="text-sm text-muted-foreground">High-resolution images of the product</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {product.metadata.photos.map((photo, index) => {
                      const src = normalizePhotoUrl(photo)
                      return (
                        <button
                          key={index}
                          onClick={() => handleViewImage(photo)}
                          className="group relative aspect-video rounded-xl overflow-hidden border-2 hover:border-primary transition-all shadow-sm hover:shadow-lg"
                        >
                          <img
                            src={src || "/fresh-produce.png"}
                            alt={`${product.metadata.name} photo ${index + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                            <div className="flex items-center text-white text-sm font-medium">
                              <ExternalLink className="w-4 h-4 mr-2" />
                              View Full Size
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="journey" className="space-y-6 mt-6">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-xl">Supply Chain Timeline</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Complete journey of this product through the supply chain
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {product.events.map((event, index) => {
                    // normalize type/key and pick icon safely
                    const key = String(event.type || "default").toLowerCase()
                    const Icon = EVENT_ICONS[key] || EVENT_ICONS["default"]
                    const isLast = index === product.events.length - 1
                    const hasReport = event.metadata?.report_cid

                    return (
                      <div key={event.id} className="relative">
                        {!isLast && (
                          <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-gradient-to-b from-primary to-primary/20" />
                        )}
                        <div className="flex gap-5">
                          <div className="flex-shrink-0">
                            <div className="relative">
                              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border-2 border-primary/20 shadow-sm">
                                {/* defensive: Icon should always be a component */}
                                {Icon ? <Icon className="w-6 h-6 text-primary" /> : <QrCode className="w-6 h-6 text-primary" />}
                              </div>
                              {!isLast && (
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary animate-pulse" />
                              )}
                            </div>
                          </div>
                          <div className="flex-1 pb-8">
                            <div className="bg-muted/30 rounded-xl p-5 border hover:border-primary/30 transition-colors">
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                                <h4 className="font-semibold text-lg">{event.description}</h4>
                                <Badge variant="outline" className="font-normal whitespace-nowrap">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {safeFormatDate(event.timestamp)}
                                </Badge>
                              </div>
                              <div className="space-y-2 text-sm text-muted-foreground mb-4">
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4 flex-shrink-0" />
                                  <span>{event.location || "-"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 flex-shrink-0" />
                                  <span>{event.actor || "-"}</span>
                                </div>
                              </div>
                              {event.metadata && Object.keys(event.metadata).length > 0 && (
                                <div className="bg-background/50 rounded-lg p-4 space-y-2">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                                    Additional Details
                                  </p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {Object.entries(event.metadata).map(([key, value]) => (
                                      <div key={key} className="flex flex-col">
                                        <span className="text-xs text-muted-foreground capitalize">
                                          {key.replace(/_/g, " ")}
                                        </span>
                                        <span className="text-sm font-medium mt-0.5">{String(value)}</span>
                                      </div>
                                    ))}
                                  </div>
                                  {hasReport && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="mt-4 bg-transparent"
                                      onClick={() => handleDownloadReport(String(event.metadata.report_cid))}
                                    >
                                      <Download className="w-4 h-4 mr-2" />
                                      Download Quality Report
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="verification" className="space-y-6 mt-6">
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-7 h-7 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">Blockchain Verified</CardTitle>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      This product has been verified on the blockchain. All information is immutable and cannot be
                      altered or falsified.
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="bg-background/80 backdrop-blur-sm rounded-lg p-4 border">
                    <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Metadata CID</div>
                    <div className="font-mono text-sm font-semibold break-all">{product.metadataCID}</div>
                  </div>
                  <div className="bg-background/80 backdrop-blur-sm rounded-lg p-4 border">
                    <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Current Owner</div>
                    <div className="font-mono text-sm font-semibold break-all">{product.owner}</div>
                  </div>
                  <div className="bg-background/80 backdrop-blur-sm rounded-lg p-4 border">
                    <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Total Events</div>
                    <div className="text-2xl font-bold text-primary">{product.events.length}</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  <Badge variant="secondary" className="px-3 py-1">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Authenticity Verified
                  </Badge>
                  <Badge variant="secondary" className="px-3 py-1">
                    <Shield className="w-3 h-3 mr-1" />
                    Tamper-Proof
                  </Badge>
                  <Badge variant="secondary" className="px-3 py-1">
                    <Leaf className="w-3 h-3 mr-1" />
                    Farm Certified
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
