"use client"

import { useState } from "react"
import { Package, ShoppingCart, QrCode, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import InventoryList from "./inventory-list"

export default function RetailerDashboard() {
  const [activeTab, setActiveTab] = useState("inventory")

  const stats = [
    {
      title: "Total Inventory",
      value: "248",
      change: "+12%",
      icon: Package,
      trend: "up",
    },
    {
      title: "Sold This Month",
      value: "156",
      change: "+23%",
      icon: ShoppingCart,
      trend: "up",
    },
    {
      title: "QR Generated",
      value: "342",
      change: "+18%",
      icon: QrCode,
      trend: "up",
    },
    {
      title: "Monthly Revenue",
      value: "$84.5K",
      change: "+15%",
      icon: TrendingUp,
      trend: "up",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-gray-200 bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Retail Management</h1>
              <p className="text-sm text-muted-foreground">Fresh Agricultural Products Store</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                R
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="border border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <p className="text-xs text-primary mt-1">{stat.change} vs last month</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <InventoryList />
      </div>
    </div>
  )
}
