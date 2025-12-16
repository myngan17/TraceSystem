"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ProductList } from "@/components/product-list"
import { CreateProductDialog } from "@/components/create-product-dialog"
import { ProductDetail } from "@/components/product-detail"
import { Package, Plus, BarChart3, Clock, CheckCircle2 } from "lucide-react"

export function ManufacturerDashboard() {
  const [view, setView] = useState<"list" | "detail">("list")
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const handleProductSelect = (productId: string) => {
    setSelectedProduct(productId)
    setView("detail")
  }

  const handleBackToList = () => {
    setView("list")
    setSelectedProduct(null)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Package className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Manufacturer Portal</h1>
                <p className="text-sm text-muted-foreground">Supply Chain Management System</p>
              </div>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Product
            </Button>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-border bg-background p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Products</p>
                  <p className="text-2xl font-semibold text-foreground">1,247</p>
                </div>
              </div>
            </Card>

            <Card className="border-border bg-background p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <Clock className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">In Production</p>
                  <p className="text-2xl font-semibold text-foreground">342</p>
                </div>
              </div>
            </Card>

            <Card className="border-border bg-background p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10">
                  <CheckCircle2 className="h-5 w-5 text-chart-2" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-semibold text-foreground">905</p>
                </div>
              </div>
            </Card>

            <Card className="border-border bg-background p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-4/10">
                  <BarChart3 className="h-5 w-5 text-chart-4" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-2xl font-semibold text-foreground">+127</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {view === "list" ? (
          <ProductList onProductSelect={handleProductSelect} />
        ) : (
          <ProductDetail productId={selectedProduct!} onBack={handleBackToList} />
        )}
      </main>

      {/* Create Product Dialog */}
      <CreateProductDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
    </div>
  )
}
