"use client"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Download, Copy, Check } from "lucide-react"
import { useState } from "react"
import QRCode from "react-qr-code"

interface QRCodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productData: {
    id: string
    name: string
    batch: string
    metadataCID: string
  }
}

export function QRCodeDialog({ open, onOpenChange, productData }: QRCodeDialogProps) {
  const [copied, setCopied] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)

  const productUrl = `https://verify.example.com/product/${productData.id}`

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(productUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadQR = () => {
    const svg = qrRef.current?.querySelector("svg")
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)
      const pngFile = canvas.toDataURL("image/png")

      const downloadLink = document.createElement("a")
      downloadLink.download = `QR_${productData.id}.png`
      downloadLink.href = pngFile
      downloadLink.click()
    }

    img.src = "data:image/svg+xml;base64," + btoa(svgData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">Product QR Code</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Scan to verify product authenticity and track supply chain
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* QR Code */}
          <div className="flex justify-center" ref={qrRef}>
            <div className="rounded-xl border-4 border-primary bg-white p-6">
              <QRCode value={productUrl} size={256} />
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-3 rounded-lg border border-border bg-background p-4">
            <div>
              <p className="text-sm text-muted-foreground">Product</p>
              <p className="font-semibold text-foreground">{productData.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Product ID</p>
                <p className="font-mono text-sm text-foreground">{productData.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Batch</p>
                <p className="font-mono text-sm text-foreground">{productData.batch}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Verification URL</p>
              <div className="mt-1 flex items-center gap-2">
                <p className="flex-1 truncate font-mono text-xs text-foreground">{productUrl}</p>
                <Button variant="ghost" size="sm" onClick={handleCopyUrl} className="h-8 w-8 p-0">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 bg-transparent" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button className="flex-1 gap-2" onClick={handleDownloadQR}>
              <Download className="h-4 w-4" />
              Download PNG
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
