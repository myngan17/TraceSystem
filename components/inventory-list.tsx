"use client"

import { useState } from "react"
import { Search, QrCode, ShoppingCart, Package, Calendar, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import GenerateQRCustomerDialog from "./generate-qr-customer-dialog"
import SellItemDialog from "./sell-item-dialog"
import { PRODUCT_STATUS_COLORS, PRODUCT_STATUS_LABELS, generateMockInventory } from "@/lib/constants"

export default function InventoryList() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedItem, setSelectedItem] = useState<any | null>(null)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [sellDialogOpen, setSellDialogOpen] = useState(false)

  const inventoryItems = generateMockInventory()

  const filteredItems = inventoryItems.filter((item: any) => {
    const matchesSearch =
      item.metadata.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.metadata.product_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.metadata.farm.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || item.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    return (
      <Badge className={PRODUCT_STATUS_COLORS[status] || "bg-muted text-muted-foreground"}>
        {PRODUCT_STATUS_LABELS[status] || status}
      </Badge>
    )
  }

  const handleGenerateQR = (item: any) => {
    setSelectedItem(item)
    setQrDialogOpen(true)
  }

  const handleSellItem = (item: any) => {
    setSelectedItem(item)
    setSellDialogOpen(true)
  }

  return (
    <>
      <Card className="border border-gray-200 rounded-lg">
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-foreground">Product Inventory</CardTitle>
              <CardDescription>Manage and track inventory stock</CardDescription>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1 sm:w-[300px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="in_stock">In Stock</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-200">
                  <TableHead>Product ID</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Farm</TableHead>
                  <TableHead>Harvest Date</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Price/Unit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No products found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item: any) => (
                    <TableRow key={item.id} className="border-b border-gray-200">
                      <TableCell className="font-mono text-sm">{item.metadata.product_id}</TableCell>
                      <TableCell className="font-medium">{item.metadata.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {item.metadata.farm}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {item.metadata.harvest_date}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Package className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className={item.quantity <= 10 ? "text-destructive font-semibold" : ""}>
                            {item.quantity} kg
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-primary">${item.price_per_unit}/kg</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleGenerateQR(item)}>
                            <QrCode className="h-4 w-4 mr-1" />
                            QR
                          </Button>
                          <Button size="sm" onClick={() => handleSellItem(item)} disabled={item.status === "sold"}>
                            <ShoppingCart className="h-4 w-4 mr-1" />
                            Sell
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

      {selectedItem && (
        <>
          <GenerateQRCustomerDialog open={qrDialogOpen} onOpenChange={setQrDialogOpen} item={selectedItem} />
          <SellItemDialog open={sellDialogOpen} onOpenChange={setSellDialogOpen} item={selectedItem} />
        </>
      )}
    </>
  )
}
