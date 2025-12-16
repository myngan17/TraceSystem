// Shared type definitions for the supply chain management system

export interface ProductMetadata {
  product_id: string
  name: string
  farm: string
  harvest_date: string
  batch_number: string
  photos: string[]
}

export interface SupplyChainEvent {
  id: string
  type: "production" | "quality_check" | "packaging" | "shipping" | "received" | "sold"
  description: string
  location: string
  timestamp: string
  actor: string
  metadata?: Record<string, any>
}

export interface Product {
  id: string
  metadata: ProductMetadata
  metadataCID: string
  owner: string
  status: "in_production" | "ready" | "in_transit" | "delivered" | "in_stock" | "sold"
  events: SupplyChainEvent[]
  createdAt: string
  updatedAt: string
}

export interface Shipment {
  id: string
  product_id: string
  product_name: string
  farm: string // From product metadata - original farm
  origin: string // Shipment source location (warehouse/depot)
  destination: string
  quantity: number
  status: "in_transit" | "delivered" | "pending"
  shipped_date: string
  estimated_arrival: string
  metadata: ProductMetadata
}

export interface InventoryItem extends Product {
  quantity: number
  price_per_unit: number
  location: string
}

export interface TransferOwnershipData {
  product_id: string
  from_address: string
  to_address: string
  transfer_date: string
  notes?: string
}

export interface VerificationReport {
  id: string
  product_id: string
  report_cid: string
  verifier: string
  status: "pending" | "passed" | "failed"
  created_at: string
  notes?: string
}

export interface PendingVerification extends Product {
  submitted_date: string
  priority: "high" | "medium" | "low"
}

export type ProductStatus = Product["status"]
export type EventType = SupplyChainEvent["type"]
export type ShipmentStatus = Shipment["status"]
export type VerificationStatus = VerificationReport["status"]

// Admin-specific types for user management
export interface User {
  id: string
  address: string
  name: string
  email: string
  role: UserRole
  status: "active" | "inactive" | "pending"
  created_at: string
  last_login?: string
}

export type UserRole = "admin" | "manufacturer" | "distributor" | "retailer" | "verifier" | "none"

export interface RoleAssignment {
  user_address: string
  role: UserRole
  assigned_by: string
  assigned_at: string
}
