"use client"

import { Package, MapPin, Calendar, Truck, CheckCircle2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import QRCode from "react-qr-code"

interface Shipment {
  id: string
  productId: string
  name: string
  farm: string
  batchNumber: string
  quantity: number
  status: string
  origin: string
  currentLocation: string
  arrivalDate: string
  sender: string
}

interface ShipmentDetailDialogProps {
  shipment: Shipment
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShipmentDetailDialog({ shipment, open, onOpenChange }: ShipmentDetailDialogProps) {
  const trackingEvents = [
    {
      date: "2025-11-23 08:00",
      location: shipment.origin,
      status: "Shipped",
      description: "Shipment dispatched from manufacturer warehouse",
    },
    {
      date: "2025-11-23 14:30",
      location: "Dong Nai Transit Hub",
      status: "In Transit",
      description: "Passed through transit hub",
    },
    {
      date: "2025-11-24 09:15",
      location: shipment.currentLocation,
      status: "Processing",
      description: "Shipment undergoing quality inspection",
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Shipment Details
          </DialogTitle>
          <DialogDescription>Detailed information and tracking history for shipment {shipment.id}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* QR Code Section */}
          <div className="flex justify-center p-6 bg-muted/30 rounded-lg">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <QRCode
                value={JSON.stringify({
                  shipmentId: shipment.id,
                  productId: shipment.productId,
                })}
                size={200}
              />
            </div>
          </div>

          {/* Product Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Product Information
            </h3>
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Product Name</p>
                <p className="font-medium">{shipment.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Product ID</p>
                <p className="font-mono text-sm">{shipment.productId}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Farm</p>
                <p className="font-medium">{shipment.farm}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Batch Number</p>
                <p className="font-mono text-sm">{shipment.batchNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Quantity</p>
                <p className="font-medium">{shipment.quantity} kg</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sender</p>
                <p className="font-medium">{shipment.sender}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Shipping Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Truck className="h-5 w-5 text-accent" />
              Shipping Information
            </h3>
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Origin
                </p>
                <p className="font-medium">{shipment.origin}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Current Location
                </p>
                <p className="font-medium">{shipment.currentLocation}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Estimated Arrival
                </p>
                <p className="font-medium">{shipment.arrivalDate}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className="mt-1 bg-accent text-accent-foreground">
                  {shipment.status === "in_transit"
                    ? "In Transit"
                    : shipment.status === "delivered"
                      ? "Delivered"
                      : "Pending"}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Tracking Timeline */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-chart-2" />
              Tracking History
            </h3>
            <div className="space-y-4">
              {trackingEvents.map((event, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="h-3 w-3 rounded-full bg-primary" />
                    {index < trackingEvents.length - 1 && <div className="w-0.5 h-full bg-border mt-2" />}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">{event.status}</p>
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground whitespace-nowrap">
                        <p>{event.date}</p>
                        <p className="flex items-center gap-1 justify-end">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
