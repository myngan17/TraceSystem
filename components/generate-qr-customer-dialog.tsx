"use client"

import { useState } from "react"
import { Download, QrCode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import QRCode from "react-qr-code"

interface GenerateQRCustomerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: {
    product_id: string
    name: string
    farm: string
    harvest_date: string
  }
}

export default function GenerateQRCustomerDialog({ open, onOpenChange, item }: GenerateQRCustomerDialogProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const qrData = JSON.stringify({
    product_id: item.product_id,
    name: item.name,
    farm: item.farm,
    harvest_date: item.harvest_date,
    verify_url: `https://verify.example.com/${item.product_id}`,
  })

  const handleDownloadQR = () => {
    setIsDownloading(true)
    const svg = document.getElementById("qr-code-customer")
    if (svg) {
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
        downloadLink.download = `QR_${item.product_id}_customer.png`
        downloadLink.href = pngFile
        downloadLink.click()
        setIsDownloading(false)
      }

      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Customer QR Code
          </DialogTitle>
          <DialogDescription>This QR code is for customers to verify product origin</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Info */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Product:</span>
              <span className="font-medium">{item.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Batch ID:</span>
              <span className="font-mono text-xs">{item.product_id}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Farm:</span>
              <span>{item.farm}</span>
            </div>
          </div>

          {/* QR Code Display */}
          <div className="flex justify-center">
            <div className="rounded-lg border bg-white p-6">
              <QRCode id="qr-code-customer" value={qrData} size={200} level="H" includeMargin />
            </div>
          </div>

          {/* Info Text */}
          <div className="rounded-lg bg-primary/5 p-4 text-sm text-muted-foreground">
            Customers can scan this QR code to view the complete traceability history of the product on the blockchain.
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={handleDownloadQR} disabled={isDownloading} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              {isDownloading ? "Downloading..." : "Download QR"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
