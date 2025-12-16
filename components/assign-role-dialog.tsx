"use client"

import { useState, useEffect } from "react"
import { Shield, AlertTriangle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { USER_ROLE_LABELS } from "@/lib/constants"
import type { User, UserRole } from "@/lib/types"

import { connectWallet } from "@/app/lib/eth"       // helper để request accounts
import { getRegistry } from "@/app/lib/contracts"  // helper trả contract instance
import { ethers } from "ethers"

interface AssignRoleDialogProps {
  user: User
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssignRole: (userId: string, role: UserRole) => void
}

export function AssignRoleDialog({ user, open, onOpenChange, onAssignRole }: AssignRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(user.role)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ADMIN check states
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null) // null = unknown / not connected
  const [roleLoading, setRoleLoading] = useState(false)

  // load current connected address and check whether it's the registry owner (admin)
  useEffect(() => {
    let mounted = true
    async function loadAdminCheck() {
      try {
        setRoleLoading(true)
        setIsAdmin(null)

        // if dialog not open skip
        if (!open) return

        // ensure ethereum available
        if (!(window as any).ethereum) {
          if (mounted) setIsAdmin(null)
          return
        }

        // request accounts (will prompt only if not connected)
        await (window as any).ethereum.request({ method: "eth_requestAccounts" })

        const provider = new ethers.BrowserProvider((window as any).ethereum)
        const signer = await provider.getSigner()
        const addr = await signer.getAddress()

        // get registry read contract (try provider first)
        let registry: any
        try {
          registry = getRegistry(provider)
        } catch (err) {
          // fallback to signer if helper doesn't accept provider
          registry = getRegistry(signer)
        }

        // call owner() on contract
        let ownerOnChain: string | null = null
        try {
          ownerOnChain = (await registry.owner()).toString()
        } catch (err) {
          // if no owner() in ABI or call fail, set null
          console.warn("registry.owner() call failed", err)
          ownerOnChain = null
        }

        if (!mounted) return

        if (!ownerOnChain) {
          // unknown owner => treat as not admin (or unknown)
          setIsAdmin(null)
        } else {
          const isAdminNow = ownerOnChain.toLowerCase() === addr.toLowerCase()
          setIsAdmin(isAdminNow)
        }
      } catch (err) {
        console.warn("Admin check failed", err)
        if (mounted) setIsAdmin(null)
      } finally {
        if (mounted) setRoleLoading(false)
      }
    }

    if (open) loadAdminCheck()

    return () => {
      mounted = false
    }
  }, [open])

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      // ensure only admin can perform this action client-side
      if (!isAdmin) {
        throw new Error("Bạn không có quyền thực hiện thao tác này (chỉ Admin mới có quyền).")
      }

      // Simulate blockchain transaction (or call real setRole here)
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // In real usage, call the contract set_role(address, role) here using a signer:
      // const { signer } = await connectWallet() ...
      // const registryWithSigner = getRegistry(signer)
      // await registryWithSigner.set_role(user.address, numericRole)

      console.log(`[v0] Calling contract: setRole("${user.address}", "${selectedRole}")`)

      onAssignRole(user.id, selectedRole)
    } catch (err: any) {
      console.error("Assign role failed:", err)
      alert("Lỗi: " + (err?.message || String(err)))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Assign Role
          </DialogTitle>
          <DialogDescription>
            Assign or change the role for this user account. This action will be recorded on the blockchain.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">User Information</Label>
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">{user.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{user.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Address:</span>
                <span className="font-mono text-xs">
                  {user.address.slice(0, 10)}...{user.address.slice(-8)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Role:</span>
                <span className="font-medium">{USER_ROLE_LABELS[user.role]}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">New Role</Label>
            <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole)}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin - Full system access</SelectItem>
                <SelectItem value="manufacturer">Manufacturer - Create products</SelectItem>
                <SelectItem value="distributor">Distributor - Manage shipments</SelectItem>
                <SelectItem value="retailer">Retailer - Manage inventory</SelectItem>
                <SelectItem value="verifier">Verifier - Verify products</SelectItem>
                <SelectItem value="none">No Role - Remove access</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedRole === "admin" && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Admin role grants full system access including user management and role assignment capabilities.
              </AlertDescription>
            </Alert>
          )}

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This action will execute the smart contract function:{" "}
              <code className="text-xs font-mono">setRole(address, role)</code>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex flex-col gap-3">
          {/* admin check messages */}
          {roleLoading && <div className="text-sm text-muted-foreground">Checking admin permission...</div>}

          {!roleLoading && isAdmin === null && (
            <div className="text-sm text-muted-foreground">
              Wallet not connected or owner unknown. Please connect your wallet to check admin permission.
            </div>
          )}

          {!roleLoading && isAdmin === false && (
            <div className="text-sm text-amber-600">
              Bạn không có quyền gán vai trò — chỉ Admin (owner contract) mới được phép.
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || roleLoading || isAdmin !== true || selectedRole === user.role}
            >
              {isSubmitting ? "Assigning Role..." : "Assign Role"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
