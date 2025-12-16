"use client"

import type React from "react"

import { useState } from "react"
import { ShoppingCart, AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface SellItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: {
    product_id: string
    name: string
    quantity: number
    price: number
  }
}

export default function SellItemDialog({ open, onOpenChange, item }: SellItemDialogProps) {
  const [quantity, setQuantity] = useState("1")
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const totalPrice = (Number.parseFloat(quantity) || 0) * item.price

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    console.log("[v0] Selling item:", {
      product_id: item.product_id,
      quantity: Number.parseFloat(quantity),
      customer: { name: customerName, phone: customerPhone },
      notes,
      total_price: totalPrice,
      timestamp: new Date().toISOString(),
    })

    setSuccess(true)
    setIsSubmitting(false)

    setTimeout(() => {
      setSuccess(false)
      onOpenChange(false)
      // Reset form
      setQuantity("1")
      setCustomerName("")
      setCustomerPhone("")
      setNotes("")
    }, 2000)
  }

  const isValid = Number.parseFloat(quantity) > 0 && Number.parseFloat(quantity) <= item.quantity

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Sell Product
          </DialogTitle>
          <DialogDescription>Record sales transaction and update event on blockchain</DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 flex flex-col items-center gap-4">
            <div className="rounded-full bg-primary/10 p-3">
              <CheckCircle2 className="h-12 w-12 text-primary" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-semibold text-lg">Sale Successful!</h3>
              <p className="text-sm text-muted-foreground">Transaction has been recorded on the system</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Product Info */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Product:</span>
                <span className="font-medium">{item.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Stock:</span>
                <span className="font-medium">{item.quantity} kg</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Unit Price:</span>
                <span className="font-medium text-primary">${(item.price / 1000).toFixed(1)}/kg</span>
              </div>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity (kg) *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.1"
                min="0.1"
                max={item.quantity}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter quantity"
                required
              />
              {Number.parseFloat(quantity) > item.quantity && (
                <p className="text-xs text-destructive">Quantity exceeds available stock</p>
              )}
            </div>

            {/* Customer Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Phone Number</Label>
                <Input
                  id="customerPhone"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional information about the transaction..."
                rows={3}
              />
            </div>

            {/* Total */}
            <div className="rounded-lg bg-primary/5 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total:</span>
                <span className="text-2xl font-bold text-primary">${(totalPrice / 1000).toFixed(2)}</span>
              </div>
            </div>

            {/* Alert */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                This transaction will be recorded on blockchain and cannot be reversed
              </AlertDescription>
            </Alert>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={!isValid || isSubmitting}>
                {isSubmitting ? "Processing..." : "Confirm Sale"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
