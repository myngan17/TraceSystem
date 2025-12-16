// wallet-provider.tsx
"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { UserRole } from "@/lib/types"
import { ethers } from "ethers"
import { getRegistry } from "@/app/lib/contracts" // ensure this is implemented

interface WalletContextType {
  address: string | null
  role: UserRole
  isConnected: boolean
  chainId: number | null
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [role, setRole] = useState<UserRole>("none")
  const [chainId, setChainId] = useState<number | null>(null)

  // helper: map numeric on-chain role -> UserRole string
  function mapNumericRoleToUserRole(n: number | null): UserRole {
    if (n === null) return "none"
    switch (n) {
      case 1:
        return "manufacturer"
      case 2:
        return "distributor"
      case 3:
        return "retailer"
      case 4:
        return "verifier"
      default:
        return "none"
    }
  }

  async function fetchOnchainRole(addr: string) {
    try {
      if (!(window as any).ethereum) return "none"
      const provider = new ethers.BrowserProvider((window as any).ethereum)
      // construct registry using provider (read-only)
      let registry: any
      try {
        registry = getRegistry(provider)
      } catch (err) {
        // fallback: maybe getRegistry expects signer
        const signer = await provider.getSigner()
        registry = getRegistry(signer)
      }

      // try read owner and numeric role (if ABI supports both)
      let ownerOnChain: string | null = null
      try {
        ownerOnChain = await registry.owner()
      } catch (err) {
        // owner() might not exist in ABI — ignore
        ownerOnChain = null
      }

      if (ownerOnChain && ownerOnChain.toLowerCase() === addr.toLowerCase()) {
        return "admin"
      }

      // try roles mapping
      try {
        const roleRaw: any = await registry.roles(addr)
        // roleRaw may be BigNumber, bigint, string
        const roleNum = typeof roleRaw === "bigint" ? Number(roleRaw) : Number(roleRaw?.toString?.() ?? roleRaw)
        return mapNumericRoleToUserRole(Number.isFinite(roleNum) ? roleNum : null)
      } catch (err) {
        // roles() may not exist — fallback none
        return "none"
      }
    } catch (err) {
      console.warn("fetchOnchainRole failed", err)
      return "none"
    }
  }

  const connectWallet = async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        // Request account access
        const accounts: string[] = await (window as any).ethereum.request({
          method: "eth_requestAccounts",
        })

        // Get chain ID
        const chainIdHex = await (window as any).ethereum.request({
          method: "eth_chainId",
        })

        const addr = accounts[0]
        setAddress(addr)
        setChainId(Number.parseInt(chainIdHex, 16))

        // Fetch role from smart contract (on-chain)
        const onchainRole = await fetchOnchainRole(addr)
        setRole(onchainRole)

        console.log("[v0] Wallet connected:", addr, "role:", onchainRole)
      } catch (error) {
        console.error("[v0] Failed to connect wallet:", error)
      }
    } else {
      alert("Please install MetaMask or another Web3 wallet!")
    }
  }

  const disconnectWallet = () => {
    setAddress(null)
    setRole("none")
    setChainId(null)
    console.log("[v0] Wallet disconnected")
  }

  // Listen for account and chain changes and update on-chain role live
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const handleAccountsChanged = async (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet()
        } else {
          const addr = accounts[0]
          setAddress(addr)
          // fetch role for the new address
          const onchainRole = await fetchOnchainRole(addr)
          setRole(onchainRole)
        }
      }

      const handleChainChanged = async (chainIdHex: string) => {
        const parsed = Number.parseInt(chainIdHex, 16)
        setChainId(parsed)
        // when chain changes, re-evaluate role (different network -> different contract)
        if (address) {
          const onchainRole = await fetchOnchainRole(address)
          setRole(onchainRole)
        }
      }

      ;(window as any).ethereum.on("accountsChanged", handleAccountsChanged)
      ;(window as any).ethereum.on("chainChanged", handleChainChanged)

      return () => {
        try {
          ;(window as any).ethereum.removeListener("accountsChanged", handleAccountsChanged)
          ;(window as any).ethereum.removeListener("chainChanged", handleChainChanged)
        } catch (err) {
          /* ignore cleanup errors */
        }
      }
    }
  }, [address])

  return (
    <WalletContext.Provider
      value={{
        address,
        role,
        isConnected: !!address,
        chainId,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider")
  }
  return context
}
