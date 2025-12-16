"use client"

import type React from "react"

import { useState } from "react"
import { ArrowRightLeft, Building2, User, FileText, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Shipment {
  id: string
  productId: string
  name: string
  quantity: number
}

interface TransferOwnershipDialogProps {
  shipment: Shipment
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TransferOwnershipDialog({ shipment, open, onOpenChange }: TransferOwnershipDialogProps) {
  const [loading, setLoading] = useState(false)
  const [transferData, setTransferData] = useState({
    recipientType: "",
    recipientId: "",
    recipientName: "",
    recipientAddress: "",
    transferNote: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Simulate blockchain transaction
    await new Promise((resolve) => setTimeout(resolve, 2000))

    console.log("[v0] Transferring ownership:", {
      shipmentId: shipment.id,
      productId: shipment.productId,
      ...transferData,
    })

    setLoading(false)
    onOpenChange(false)

    // Reset form
    setTransferData({
      recipientType: "",
      recipientId: "",
      recipientName: "",
      recipientAddress: "",
      transferNote: "",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <ArrowRightLeft className="h-6 w-6 text-primary" />
            Transfer Ownership
          </DialogTitle>
          <DialogDescription>Transfer ownership of shipment {shipment.id} on blockchain</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Warning Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Ownership transfer transactions are recorded on the blockchain and cannot be reversed. Please verify all
              information before confirming.
            </AlertDescription>
          </Alert>

          {/* Product Info */}
          <div className="p-4 bg-muted/30 rounded-lg space-y-2">
            <p className="text-sm text-muted-foreground">Shipment Information</p>
            <p className="font-medium">{shipment.name}</p>
            <div className="flex justify-between text-sm">
              <span className="font-mono text-muted-foreground">{shipment.productId}</span>
              <span className="font-medium">{shipment.quantity} kg</span>
            </div>
          </div>

          {/* Recipient Type */}
          <div className="space-y-2">
            <Label htmlFor="recipientType">Recipient Type *</Label>
            <Select
              value={transferData.recipientType}
              onValueChange={(value) => setTransferData({ ...transferData, recipientType: value })}
              required
            >
              <SelectTrigger id="recipientType">
                <SelectValue placeholder="Select recipient type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="retailer">Retailer</SelectItem>
                <SelectItem value="wholesaler">Wholesaler</SelectItem>
                <SelectItem value="distributor">Another Distributor</SelectItem>
                <SelectItem value="processor">Processor</SelectItem>
                <SelectItem value="exporter">Exporter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Recipient ID */}
          <div className="space-y-2">
            <Label htmlFor="recipientId" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Recipient ID *
            </Label>
            <Input
              id="recipientId"
              placeholder="e.g., RETAILER-001"
              value={transferData.recipientId}
              onChange={(e) => setTransferData({ ...transferData, recipientId: e.target.value })}
              required
            />
            <p className="text-sm text-muted-foreground">Recipient's identifier on the blockchain system</p>
          </div>

          {/* Recipient Name */}
          <div className="space-y-2">
            <Label htmlFor="recipientName" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Recipient Name *
            </Label>
            <Input
              id="recipientName"
              placeholder="e.g., ABC Supermarket"
              value={transferData.recipientName}
              onChange={(e) => setTransferData({ ...transferData, recipientName: e.target.value })}
              required
            />
          </div>

          {/* Recipient Address */}
          <div className="space-y-2">
            <Label htmlFor="recipientAddress">Recipient Address *</Label>
            <Input
              id="recipientAddress"
              placeholder="e.g., 123 ABC Street, District 1, HCM City"
              value={transferData.recipientAddress}
              onChange={(e) => setTransferData({ ...transferData, recipientAddress: e.target.value })}
              required
            />
          </div>

          {/* Transfer Note */}
          <div className="space-y-2">
            <Label htmlFor="transferNote" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Transfer Note
            </Label>
            <Textarea
              id="transferNote"
              placeholder="Notes about the ownership transfer..."
              value={transferData.transferNote}
              onChange={(e) => setTransferData({ ...transferData, transferNote: e.target.value })}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Processing on blockchain...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="h-4 w-4" />
                  Confirm Transfer
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
