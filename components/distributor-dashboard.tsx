"use client"

import { useState } from "react"
import { Package, Truck, ArrowRightLeft, TrendingUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IncomingShipments } from "@/components/incoming-shipments"

export function DistributorDashboard() {
  const [stats] = useState({
    totalShipments: 156,
    inTransit: 24,
    delivered: 132,
    thisMonth: 45,
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-balance">Distributor Control Panel</h1>
          <p className="text-muted-foreground text-pretty">
            Manage incoming shipments, transport events, and product ownership transfers
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Shipments</CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalShipments}</div>
              <p className="text-xs text-muted-foreground">All processed shipments</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Transit</CardTitle>
              <Truck className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{stats.inTransit}</div>
              <p className="text-xs text-muted-foreground">Shipments on the way</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivered</CardTitle>
              <ArrowRightLeft className="h-4 w-4 text-chart-2" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-chart-2">{stats.delivered}</div>
              <p className="text-xs text-muted-foreground">Completed transfers</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-chart-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-chart-4">{stats.thisMonth}</div>
              <p className="text-xs text-muted-foreground">+12% vs last month</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="shipments" className="space-y-4">
          <TabsList className="bg-card border border-gray-200 shadow-sm">
            <TabsTrigger value="shipments" className="gap-2">
              <Package className="h-4 w-4" />
              Incoming Shipments
            </TabsTrigger>
            <TabsTrigger value="tracking" className="gap-2">
              <Truck className="h-4 w-4" />
              Shipment Tracking
            </TabsTrigger>
          </TabsList>

          <TabsContent value="shipments" className="space-y-4">
            <IncomingShipments />
          </TabsContent>

          <TabsContent value="tracking" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Shipment Tracking</CardTitle>
                <CardDescription>View real-time status of all shipments in transit</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <div className="text-center space-y-2">
                    <Truck className="h-12 w-12 mx-auto opacity-50" />
                    <p>Tracking feature is under development</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
