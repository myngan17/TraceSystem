"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Factory, Truck, Store, ShieldCheck, Users, QrCode, ArrowRight, CheckCircle2, Shield, Leaf } from "lucide-react";
import Link from "next/link";
import { useWallet } from "@/components/wallet-provider";
import { USER_ROLE_LABELS } from "@/lib/constants";
import { useCallback } from "react";

export default function Page() {
  const { isConnected, role, connectWallet } = useWallet();

  // Mỗi feature bây giờ có requiredRole (string) — admin có quyền vào tất cả
  const features = [
    {
      icon: Factory,
      title: "Manufacturer",
      description: "Create and register products on blockchain with IPFS metadata",
      href: "/manufacturer",
      color: "text-chart-1",
      requiredRole: "manufacturer",
    },
    {
      icon: Truck,
      title: "Distributor",
      description: "Track shipments, add transport events, and transfer ownership",
      href: "/distributor",
      color: "text-chart-4",
      requiredRole: "distributor",
    },
    {
      icon: Store,
      title: "Retailer",
      description: "Manage inventory, generate customer QR codes, and process sales",
      href: "/retailer",
      color: "text-chart-2",
      requiredRole: "retailer",
    },
    {
      icon: ShieldCheck,
      title: "Verifier",
      description: "Review products, upload quality reports, and certify authenticity",
      href: "/verifier",
      color: "text-accent",
      requiredRole: "verifier",
    },
    {
      icon: Users,
      title: "Admin",
      description: "Manage user accounts and assign roles across the platform",
      href: "/admin",
      color: "text-destructive",
      requiredRole: "admin",
    },
  ];

  // helper kiểm tra quyền: admin luôn allow; nếu feature.requiredRole === role -> allow
  const isAllowed = useCallback(
    (requiredRole?: string) => {
      if (!requiredRole) return false;
      if (!isConnected) return false;
      if (role === "admin") return true; // admin has full access
      return role === requiredRole;
    },
    [isConnected, role]
  );

  // Hàm xử lý click khi không được phép (hiện alert, bạn có thể thay bằng toast)
  const handleNotAllowed = (requiredRole?: string) => {
    if (!isConnected) {
      // nếu chưa connect thì gọi connectWallet
      connectWallet();
      return;
    }
    if (role !== "admin") {
      alert(`Bạn không có quyền truy cập (cần quyền: ${requiredRole}). Hiện tại bạn là: ${USER_ROLE_LABELS[role]}`);
    }
  };

  // các lợi ích (giữ nguyên)
  const benefits = [
    {
      icon: Shield,
      title: "Blockchain Security",
      description: "Immutable records ensure product authenticity and prevent fraud",
    },
    {
      icon: CheckCircle2,
      title: "Full Transparency",
      description: "Track every step from farm to table with complete visibility",
    },
    {
      icon: Leaf,
      title: "Sustainability",
      description: "Build trust with consumers through verified organic practices",
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative border-b border-primary/30 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="/lush-green-agricultural-farm-with-fresh-organic-ve.jpg"
            alt="Agricultural farm background"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/30 to-black/40" />
        </div>

        <div className="container relative z-10 px-4 py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 backdrop-blur-sm px-4 py-1.5 text-sm shadow-lg">
              <Shield className="h-4 w-4 text-white" />
              <span className="font-medium text-white">Blockchain-Powered Supply Chain</span>
            </div>
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl text-white drop-shadow-lg">
              Track Your Products from Farm to Table
            </h1>
            <p className="text-balance text-lg md:text-xl text-white/95 drop-shadow-md">
              Complete transparency and traceability for agricultural supply chains. Every step verified on blockchain
              with IPFS storage.
            </p>

            {!isConnected ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button
                  size="lg"
                  onClick={connectWallet}
                  className="gap-2 shadow-xl bg-primary hover:bg-primary/90 text-white"
                >
                  Connect Wallet to Start
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm shadow-xl"
                >
                  <Link href="/customer">Verify a Product</Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <div className="rounded-lg border-white/30 bg-white/10 p-3">
                  <p className="text-sm text-white/80">You are connected as</p>
                  <p className="text-lg font-semibold text-white">{USER_ROLE_LABELS[role]}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto max-w-6xl px-4 py-16">
        <div className="mb-12 text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">Platform Roles</h2>
          <p className="mt-3 text-balance text-lg text-muted-foreground">
            Choose your role in the supply chain ecosystem
          </p>
        </div>

        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 justify-items-center">
            {features.map((feature) => {
              const Icon = feature.icon;
              const allowed = isAllowed(feature.requiredRole);
              return (
                <Card key={feature.title} className="group border-primary/40 transition-all hover:shadow-lg hover:border-primary w-full">
                  <CardHeader className="text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className={`h-6 w-6 ${feature.color}`} />
                      </div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                    </div>
                    <CardDescription className="mt-3">{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    {allowed ? (
                      <Button variant="ghost" className="w-full justify-between group-hover:bg-primary/10" asChild>
                        <Link href={feature.href}>
                          Access Dashboard
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        className="w-full justify-between opacity-60 cursor-not-allowed"
                        onClick={() => handleNotAllowed(feature.requiredRole)}
                      >
                        {/* nếu chưa kết nối, nút sẽ gọi connectWallet; nếu đã kết nối nhưng không có quyền thì show alert */}
                        {isConnected ? "Access Dashboard (No permission)" : "Connect Wallet to Access"}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Customer Verification Card */}
          <Card className="group border-primary/50 bg-accent/5 transition-all hover:shadow-lg hover:border-primary mt-6">
            <CardHeader className="text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/20">
                  <QrCode className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <CardTitle className="text-xl">Customer Verification</CardTitle>
                  <CardDescription className="mt-1">
                    Public interface for customers to scan QR codes and verify product authenticity
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button variant="default" className="gap-2" asChild>
                <Link href="/customer">
                  Verify Product
                  <QrCode className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="border-t border-primary/30 bg-muted/30 py-16">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">Why Blockchain Traceability?</h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div key={benefit.title} className="flex flex-col items-center text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">{benefit.title}</h3>
                  <p className="text-balance text-muted-foreground">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!isConnected && (
        <section className="border-t border-primary/30 py-16">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="mx-auto max-w-2xl text-center space-y-6">
              <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">Ready to Get Started?</h2>
              <p className="text-balance text-lg text-muted-foreground">
                Connect your wallet to access the platform and start managing your supply chain with blockchain
                technology.
              </p>
              <Button size="lg" onClick={connectWallet} className="gap-2">
                Connect Wallet Now
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
