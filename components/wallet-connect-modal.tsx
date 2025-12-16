"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Wallet, ExternalLink, Leaf } from "lucide-react"
import { useWallet } from "./wallet-provider"

interface WalletConnectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WalletConnectModal({ open, onOpenChange }: WalletConnectModalProps) {
  const { connectWallet } = useWallet()

  const handleConnect = async (walletType: string) => {
    await connectWallet()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
              <Leaf className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <DialogTitle className="text-center">Connect Your Wallet</DialogTitle>
          <DialogDescription className="text-center">
            Choose your preferred wallet to access the agricultural supply chain platform
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* MetaMask */}
          <Button
            variant="outline"
            className="w-full h-16 justify-start gap-4 hover:bg-primary/5 hover:border-primary transition-all bg-transparent"
            onClick={() => handleConnect("metamask")}
          >
            <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-orange-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium">MetaMask</p>
              <p className="text-xs text-muted-foreground">Connect using MetaMask wallet</p>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </Button>

          {/* WalletConnect */}
          <Button
            variant="outline"
            className="w-full h-16 justify-start gap-4 hover:bg-primary/5 hover:border-primary transition-all bg-transparent"
            onClick={() => handleConnect("walletconnect")}
          >
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-blue-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium">WalletConnect</p>
              <p className="text-xs text-muted-foreground">Scan with mobile wallet</p>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </Button>

          {/* Coinbase Wallet */}
          <Button
            variant="outline"
            className="w-full h-16 justify-start gap-4 hover:bg-primary/5 hover:border-primary transition-all bg-transparent"
            onClick={() => handleConnect("coinbase")}
          >
            <div className="h-10 w-10 rounded-lg bg-blue-600/10 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium">Coinbase Wallet</p>
              <p className="text-xs text-muted-foreground">Connect using Coinbase wallet</p>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-center text-muted-foreground">
            By connecting your wallet, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
