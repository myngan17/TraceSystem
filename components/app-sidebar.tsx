"use client"

import type React from "react"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Factory,
  Truck,
  Store,
  ShieldCheck,
  Users,
  QrCode,
  ChevronRight,
  ArrowLeft,
  Shield,
  Sparkles,
} from "lucide-react"
import { useWallet } from "./wallet-provider"
import type { UserRole } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: UserRole[]
}

const navItems: NavItem[] = [
  {
    title: "Manufacturer",
    href: "/manufacturer",
    icon: Factory,
    roles: ["manufacturer", "admin"],
  },
  {
    title: "Distributor",
    href: "/distributor",
    icon: Truck,
    roles: ["distributor", "admin"],
  },
  {
    title: "Retailer",
    href: "/retailer",
    icon: Store,
    roles: ["retailer", "admin"],
  },
  {
    title: "Verifier",
    href: "/verifier",
    icon: ShieldCheck,
    roles: ["verifier", "admin"],
  },
  {
    title: "Admin",
    href: "/admin",
    icon: Users,
    roles: ["admin"],
  },
  {
    title: "Verify Product",
    href: "/customer",
    icon: QrCode,
    roles: ["manufacturer", "distributor", "retailer", "verifier", "admin", "none"],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { role, isConnected } = useWallet()

  // Filter navigation items based on user role
  const filteredNavItems = navItems.filter((item) => item.roles.includes(role))

  const isOnRolePage = pathname !== "/" && pathname !== "/login"

  if (!isConnected) {
    return null
  }

  return (
    <aside className="hidden bg-gradient-to-b from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 lg:block lg:w-64 relative overflow-hidden">
      <div className="absolute inset-0 opacity-3">
        <img
          src="/organic-farm-fresh-vegetables-growing-fields.jpg"
          alt="Farm background"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="relative flex h-full flex-col">
        <ScrollArea className="flex-1 py-4">
          <nav className="flex flex-col gap-1 px-3">
            {isOnRolePage && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 px-4 py-2.5 mb-3 bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 border border-gray-200/50 dark:border-gray-700/50 rounded-lg transition-all duration-200"
                onClick={() => router.push("/")}
              >
                <ArrowLeft className="h-4 w-4 text-green-600" />
                <span className="flex-1 text-left font-medium">Change Role</span>
              </Button>
            )}

            {/* Enhanced navigation items */}
            {filteredNavItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group",
                      isActive
                        ? "bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-700 dark:text-green-400 font-semibold shadow-md border border-green-500/30"
                        : "hover:bg-white/70 dark:hover:bg-gray-800/70 hover:shadow-sm",
                    )}
                  >
                    <Icon className={cn("h-4 w-4", isActive && "text-green-600")} />
                    <span className="flex-1 text-left">{item.title}</span>
                    {isActive && <ChevronRight className="h-4 w-4 text-green-600" />}
                  </Button>
                </Link>
              )
            })}
          </nav>
        </ScrollArea>

        {/* Enhanced footer with blockchain info */}
        <div className="p-4 relative overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <img
              src="/blockchain-network-visualization-technology.jpg"
              alt="Blockchain"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="relative rounded-xl bg-gradient-to-br from-green-600/15 to-emerald-600/15 p-4 backdrop-blur-sm border border-green-500/20 shadow-lg text-center">
            <div className="flex flex-col items-center gap-2 mb-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-600 text-white shadow-md">
                <Shield className="h-4 w-4" />
              </div>
              <p className="font-semibold text-green-900 dark:text-green-100">Blockchain Secured</p>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              All transactions are verified and stored on-chain
            </p>
            <div className="mt-3 flex items-center justify-center gap-1 text-xs text-green-600 dark:text-green-400">
              <Sparkles className="h-3 w-3" />
              <span className="font-medium">100% Transparent</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
