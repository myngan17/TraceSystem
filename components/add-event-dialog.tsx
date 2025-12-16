"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2 } from "lucide-react";

import { connectWallet, getSigner } from "@/app/lib/eth";
import { getRegistry } from "@/app/lib/contracts";
import { ethers } from "ethers";

interface AddEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  onAdded?: () => void; // callback để reload UI sau khi thành công
}

function productIdToBytes32Hex(id: string) {
  const enc = new TextEncoder();
  const b = enc.encode(id);
  const out = new Uint8Array(32);
  if (b.length >= 32) out.set(b.slice(0, 32));
  else out.set(b);
  return "0x" + Array.from(out).map((x) => x.toString(16).padStart(2, "0")).join("");
}

function formatBytes32Action(s: string) {
  // try ethers util first
  try {
    if ((ethers as any).utils?.formatBytes32String) return (ethers as any).utils.formatBytes32String(s);
    if ((ethers as any).formatBytes32String) return (ethers as any).formatBytes32String(s);
  } catch {}
  // fallback manual pad/truncate
  const enc = new TextEncoder();
  const b = enc.encode(s);
  const out = new Uint8Array(32);
  out.set(b.slice(0, 32));
  return "0x" + Array.from(out).map((x) => x.toString(16).padStart(2, "0")).join("");
}

export function AddEventDialog({ open, onOpenChange, productId, onAdded }: AddEventDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [formData, setFormData] = useState({
    eventType: "",
    description: "",
    location: "",
    operator: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // connect wallet & get signer
      const r = await connectWallet();
      if (r.error || !r.signer) throw new Error(r.error || "No signer");

      const signer = r.signer;
      const registry = getRegistry(signer);

      // prepare params
      const pid = productIdToBytes32Hex(productId);
      const action = formatBytes32Action(formData.eventType || "event"); // bytes32
      // For data_cid: you can upload event extra metadata to IPFS and then pass bytes.
      // For now use empty bytes (0x) or a small text:
      const dataCidHex = "0x"; // or ethers.toUtf8Bytes("Qm...") hex

      // call contract
      const tx = await registry.add_event(pid, action, dataCidHex, { gasLimit: 300000 });
      await tx.wait();

      setSubmitSuccess(true);
      // callback để reload events / status
      onAdded?.();

      setTimeout(() => {
        setSubmitSuccess(false);
        onOpenChange(false);
        setFormData({ eventType: "", description: "", location: "", operator: "" });
      }, 1500);
    } catch (err: any) {
      console.error("Add event failed:", err);
      alert("Add event failed: " + (err?.message || err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add Product Event</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="eventType" className="text-foreground">
              Event Type
            </Label>
            <Select
              value={formData.eventType}
              onValueChange={(value) => setFormData({ ...formData, eventType: value })}
              required
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manufacturing">Manufacturing</SelectItem>
                <SelectItem value="quality-check">Quality Check</SelectItem>
                <SelectItem value="packaging">Packaging</SelectItem>
                <SelectItem value="shipping">Shipping</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
                <SelectItem value="storage">Storage</SelectItem>
                <SelectItem value="inspection">Inspection</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-foreground">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Enter event description..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={3}
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="text-foreground">
              Location
            </Label>
            <Input
              id="location"
              placeholder="City, Country"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              required
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="operator" className="text-foreground">
              Operator Name
            </Label>
            <Input
              id="operator"
              placeholder="Person responsible"
              value={formData.operator}
              onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
              required
              className="bg-background"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : submitSuccess ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Added!
                </>
              ) : (
                "Add Event"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
