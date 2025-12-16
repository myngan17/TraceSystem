"use client"

import { useState } from "react"
import { Users, UserCheck, UserX, Activity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AccountManagement } from "./account-management"

export function AdminDashboard() {
  const [stats] = useState({
    total_users: 156,
    active_users: 142,
    pending_users: 8,
    inactive_users: 6,
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-gray-200 bg-card">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-balance">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">Manage users and assign roles across the supply chain system</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="border border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_users}</div>
              <p className="text-xs text-muted-foreground mt-1">All registered accounts</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active_users}</div>
              <p className="text-xs text-chart-2 mt-1">+5% from last month</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending_users}</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting role assignment</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive Users</CardTitle>
              <UserX className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inactive_users}</div>
              <p className="text-xs text-muted-foreground mt-1">Disabled accounts</p>
            </CardContent>
          </Card>
        </div>

        <AccountManagement />
      </div>
    </div>
  )
}
