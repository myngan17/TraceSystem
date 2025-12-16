"use client"

import { useEffect, useState } from "react"
import { Search, UserCog } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AssignRoleDialog } from "./assign-role-dialog"
import type { User, UserRole } from "@/lib/types"

// Nếu bạn không có kiểu User sẵn, dùng kiểu tối giản này:
type UIUser = {
  id: string
  name?: string
  address: string
  roleNum?: number
  roleLabel?: string
  status?: string
  email?: string
  last_login?: string | null
}

const ROLE_LABELS: Record<number, string> = {
  0: "none",
  1: "manufacturer",
  2: "distributor",
  3: "retailer",
  4: "verifier",
}

const ROLE_COLORS: Record<string, string> = {
  none: "bg-muted text-muted-foreground",
  manufacturer: "bg-blue-100 text-blue-800",
  distributor: "bg-amber-100 text-amber-800",
  retailer: "bg-violet-100 text-violet-800",
  verifier: "bg-green-100 text-green-800",
}

export function AccountManagement() {
  const [users, setUsers] = useState<UIUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedUser, setSelectedUser] = useState<UIUser | null>(null)
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/accounts")
        if (!res.ok) throw new Error(`API /api/accounts lỗi: ${res.status}`)
        const jr = await res.json()
        if (!mounted) return

        // jr.accounts expected: [{ id, address, roleNum, roleLabel, ... }]
        const list: UIUser[] = (jr.accounts || []).map((a: any) => ({
          id: a.id ?? a.address,
          name: a.label ?? a.id ?? a.address,
          address: (a.address || "").toLowerCase(),
          roleNum: typeof a.roleNum === "number" ? a.roleNum : Number(a.roleNum ?? 0),
          roleLabel: a.roleLabel ?? ROLE_LABELS[Number(a.roleNum ?? 0)] ?? "none",
          status: a.status ?? "active",
          email: a.email ?? "",
          last_login: a.last_login ?? null,
        }))

        setUsers(list)
      } catch (e: any) {
        console.error("load /api/accounts failed", e)
        setError(e?.message ?? String(e))
        // fallback: giữ users rỗng
        setUsers([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const filtered = users
    .filter((u) => {
      if (roleFilter === "all") return true
      return (u.roleLabel ?? "none") === roleFilter
    })
    .filter((u) => {
      if (statusFilter === "all") return true
      return (u.status ?? "active") === statusFilter
    })
    .filter((u) => {
      const q = searchTerm.trim().toLowerCase()
      if (!q) return true
      return (
        (u.name ?? "").toLowerCase().includes(q) ||
        (u.address ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q)
      )
    })

  function handleOpenRoleDialog(user: UIUser) {
    setSelectedUser(user)
    setIsRoleDialogOpen(true)
  }

  // local role assignment (UI only). In production call server/contract to change role.
  function handleRoleAssignment(userId: string, newRole: UserRole) {
    setUsers((prev) => prev.map(u => {
      if (u.id !== userId) return u
      return { ...u, roleLabel: newRole, roleNum: Object.keys(ROLE_LABELS).find(n => ROLE_LABELS[Number(n)] === newRole) ? Number(Object.keys(ROLE_LABELS).find(n => ROLE_LABELS[Number(n)] === newRole)) : u.roleNum }
    }))
    setIsRoleDialogOpen(false)
  }

  return (
    <>
      <Card className="border border-gray-200 rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Account Management
          </CardTitle>
          <CardDescription>View and manage user accounts and role assignments</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="manufacturer">Manufacturer</SelectItem>
                <SelectItem value="distributor">Distributor</SelectItem>
                <SelectItem value="retailer">Retailer</SelectItem>
                <SelectItem value="verifier">Verifier</SelectItem>
                <SelectItem value="none">No Role</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-200">
                  <TableHead>User</TableHead>
                  <TableHead>Wallet Address</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No users found</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((user) => (
                    <TableRow key={user.id} className="border-b border-gray-200">
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.name ?? user.address}</div>
                          <div className="text-sm text-muted-foreground">{user.email ?? ""}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{(user.address || "").slice(0, 6)}...{(user.address || "").slice(-4)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={ROLE_COLORS[user.roleLabel ?? "none"] || "bg-muted"}>
                          {user.roleLabel ?? "none"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={user.status === "active" ? "bg-green-100 text-green-800" : "bg-muted"}>
                          {user.status ?? "active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.last_login ? new Date(user.last_login).toLocaleString() : "Never"}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => handleOpenRoleDialog(user)}>
                          Assign Role
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedUser && (
        <AssignRoleDialog
          user={selectedUser as any}
          open={isRoleDialogOpen}
          onOpenChange={setIsRoleDialogOpen}
          onAssignRole={(userId: string, newRole: UserRole) => handleRoleAssignment(userId, newRole)}
        />
      )}

      {error && (
        <div className="mt-4 text-sm text-destructive">
          Error: {error}. Kiểm tra API <code>/api/accounts</code> đã triển khai chưa và file `data/ape-accounts.json`.
        </div>
      )}
    </>
  )
}
