"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Wallet, LogOut, User, ChevronDown, CheckCircle2, AlertCircle, Leaf, Sparkles } from "lucide-react"
import { useWallet } from "./wallet-provider"
import { USER_ROLE_LABELS, USER_ROLE_COLORS } from "@/lib/constants"

export function AppHeader() {
  const { address, role, isConnected, chainId, connectWallet, disconnectWallet } = useWallet()

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const getChainName = (id: number) => {
    const chains: Record<number, string> = {
      1: "Ethereum Mainnet",
      5: "Goerli Testnet",
      11155111: "Sepolia Testnet",
      137: "Polygon Mainnet",
      80001: "Mumbai Testnet",
    }
    return chains[id] || `Chain ${id}`
  }

  const isCorrectNetwork = chainId === 11155111

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/70 dark:bg-gray-950/70 supports-[backdrop-filter]:bg-white/60">
      <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-emerald-500/5 to-teal-500/5 animate-gradient-x"></div>
      <div className="container relative flex h-16 items-center justify-between px-4">
        {/* Logo section with enhanced design */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 opacity-75 blur group-hover:opacity-100 transition duration-300"></div>
              <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-green-600 to-emerald-600 shadow-lg">
                <Leaf className="h-6 w-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent">
                Supply Chain
              </h1>
              <p className="text-xs text-gray-600 dark:text-gray-400">Blockchain Traceability</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isConnected && (
            <>
              {/* Network Status with enhanced design */}
              <div className="hidden items-center gap-2 rounded-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-4 py-2.5 shadow-lg border border-gray-200/50 dark:border-gray-800/50 sm:flex">
                <div className="relative">
                  {isCorrectNetwork ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="absolute inset-0 animate-ping">
                        <CheckCircle2 className="h-4 w-4 text-green-500 opacity-75" />
                      </span>
                    </>
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" />
                  )}
                </div>
                <span className="text-sm font-medium">{chainId ? getChainName(chainId) : "Unknown"}</span>
              </div>

              {/* Role badge with glow effect */}
              <div className="relative">
                <Badge variant="outline" className={`${USER_ROLE_COLORS[role]} shadow-lg border-2`}>
                  <Sparkles className="h-3 w-3 mr-1" />
                  {USER_ROLE_LABELS[role]}
                </Badge>
              </div>

              {/* Wallet Menu with enhanced design */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border-2 hover:border-green-500/50"
                  >
                    <Wallet className="h-4 w-4" />
                    <span className="hidden sm:inline font-mono">{formatAddress(address!)}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-72 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border-2"
                >
                  <DropdownMenuLabel className="text-base">Wallet Details</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="px-3 py-4 space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
                      <User className="h-5 w-5 text-green-600" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-600 dark:text-gray-400">Address</p>
                        <p className="text-sm font-mono font-semibold">{formatAddress(address!)}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Role:</span>
                      <Badge variant="outline" className={`${USER_ROLE_COLORS[role]} border-2`}>
                        {USER_ROLE_LABELS[role]}
                      </Badge>
                    </div>
                    {chainId && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
                        {isCorrectNetwork ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                        <span className="text-sm font-medium">{getChainName(chainId)}</span>
                      </div>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={disconnectWallet} className="text-red-600 font-medium">
                    <LogOut className="mr-2 h-4 w-4" />
                    Disconnect Wallet
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          {!isConnected && (
            <Button
              onClick={connectWallet}
              className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-300 text-white font-semibold"
            >
              <Wallet className="h-4 w-4" />
              Connect Wallet
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
