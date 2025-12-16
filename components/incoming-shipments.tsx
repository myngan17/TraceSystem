"use client"
import { SHIPMENT_STATUS_COLORS, SHIPMENT_STATUS_LABELS, generateMockShipments } from "@/lib/constants"

import { useState } from "react"
import { Package, MapPin, Calendar, QrCode, ArrowRightLeft, Plus } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ShipmentDetailDialog } from "@/components/shipment-detail-dialog"
import { AddTransportEventDialog } from "@/components/add-transport-event-dialog"
import { TransferOwnershipDialog } from "@/components/transfer-ownership-dialog"

export function IncomingShipments() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedShipment, setSelectedShipment] = useState<any | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [transportEventDialogOpen, setTransportEventDialogOpen] = useState(false)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)

  const [shipments] = useState(generateMockShipments())

  const filteredShipments = shipments.filter((shipment: any) => {
    const matchesSearch =
      shipment.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.product_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || shipment.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    return (
      <Badge className={SHIPMENT_STATUS_COLORS[status] || "bg-muted text-muted-foreground"}>
        {SHIPMENT_STATUS_LABELS[status] || status}
      </Badge>
    )
  }

  const handleViewDetail = (shipment: any) => {
    setSelectedShipment(shipment)
    setDetailDialogOpen(true)
  }

  const handleAddTransportEvent = (shipment: any) => {
    setSelectedShipment(shipment)
    setTransportEventDialogOpen(true)
  }

  const handleTransferOwnership = (shipment: any) => {
    setSelectedShipment(shipment)
    setTransferDialogOpen(true)
  }

  return (
    <>
      <Card className="border-primary/20 shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Incoming Shipments
          </CardTitle>
          <CardDescription>Manage shipments received from manufacturers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name, product ID, batch..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_transit">In transit</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-b border-gray-200">
                  <TableHead>Shipment ID</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Farm</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Shipped Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShipments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No shipments found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredShipments.map((shipment: any) => (
                    <TableRow key={shipment.id} className="hover:bg-muted/30 border-b border-gray-200">
                      <TableCell className="font-mono text-sm">{shipment.id}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{shipment.product_name}</div>
                          <div className="text-sm text-muted-foreground">{shipment.product_id}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {shipment.metadata?.farm || shipment.origin}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{shipment.destination}</TableCell>
                      <TableCell className="font-medium">{shipment.quantity} kg</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {shipment.shipped_date}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(shipment.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleViewDetail(shipment)}>
                            <QrCode className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddTransportEvent(shipment)}
                            disabled={shipment.status === "delivered"}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTransferOwnership(shipment)}
                            disabled={shipment.status !== "delivered"}
                          >
                            <ArrowRightLeft className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      {selectedShipment && (
        <>
          <ShipmentDetailDialog
            shipment={selectedShipment}
            open={detailDialogOpen}
            onOpenChange={setDetailDialogOpen}
          />
          <AddTransportEventDialog
            shipment={selectedShipment}
            open={transportEventDialogOpen}
            onOpenChange={setTransportEventDialogOpen}
          />
          <TransferOwnershipDialog
            shipment={selectedShipment}
            open={transferDialogOpen}
            onOpenChange={setTransferDialogOpen}
          />
        </>
      )}
    </>
  )
}
