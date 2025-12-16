"use client"

import type React from "react"

import { useState } from "react"
import { Plus, MapPin, Calendar, FileText } from "lucide-react"
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

interface Shipment {
  id: string
  productId: string
  name: string
}

interface AddTransportEventDialogProps {
  shipment: Shipment
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddTransportEventDialog({ shipment, open, onOpenChange }: AddTransportEventDialogProps) {
  const [loading, setLoading] = useState(false)
  const [eventData, setEventData] = useState({
    eventType: "",
    location: "",
    timestamp: "",
    description: "",
    temperature: "",
    humidity: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    console.log("[v0] Adding transport event:", {
      shipmentId: shipment.id,
      ...eventData,
    })

    setLoading(false)
    onOpenChange(false)

    // Reset form
    setEventData({
      eventType: "",
      location: "",
      timestamp: "",
      description: "",
      temperature: "",
      humidity: "",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Plus className="h-6 w-6 text-primary" />
            Add Transport Event
          </DialogTitle>
          <DialogDescription>Record an event during the shipment transport of {shipment.id}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Info */}
          <div className="p-4 bg-muted/30 rounded-lg space-y-2">
            <p className="text-sm text-muted-foreground">Shipment</p>
            <p className="font-medium">{shipment.name}</p>
            <p className="text-sm font-mono text-muted-foreground">{shipment.productId}</p>
          </div>

          {/* Event Type */}
          <div className="space-y-2">
            <Label htmlFor="eventType">Event Type *</Label>
            <Select
              value={eventData.eventType}
              onValueChange={(value) => setEventData({ ...eventData, eventType: value })}
              required
            >
              <SelectTrigger id="eventType">
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pickup">Pickup</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="checkpoint">Checkpoint</SelectItem>
                <SelectItem value="customs">Customs</SelectItem>
                <SelectItem value="warehouse">Warehouse Entry</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
                <SelectItem value="quality_check">Quality Check</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location *
            </Label>
            <Input
              id="location"
              placeholder="e.g., HCM City Transit Hub"
              value={eventData.location}
              onChange={(e) => setEventData({ ...eventData, location: e.target.value })}
              required
            />
          </div>

          {/* Timestamp */}
          <div className="space-y-2">
            <Label htmlFor="timestamp" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Timestamp *
            </Label>
            <Input
              id="timestamp"
              type="datetime-local"
              value={eventData.timestamp}
              onChange={(e) => setEventData({ ...eventData, timestamp: e.target.value })}
              required
            />
          </div>

          {/* Environmental Conditions */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature (°C)</Label>
              <Input
                id="temperature"
                type="number"
                placeholder="e.g., 25"
                value={eventData.temperature}
                onChange={(e) => setEventData({ ...eventData, temperature: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="humidity">Humidity (%)</Label>
              <Input
                id="humidity"
                type="number"
                placeholder="e.g., 65"
                value={eventData.humidity}
                onChange={(e) => setEventData({ ...eventData, humidity: e.target.value })}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Additional notes about this event..."
              value={eventData.description}
              onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
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
                  Processing...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Event
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
