// Shared constants for the supply chain management system

export const PRODUCT_STATUS_LABELS: Record<string, string> = {
  in_production: "In Production",
  ready: "Ready",
  in_transit: "In Transit",
  delivered: "Delivered",
  in_stock: "In Stock",
  sold: "Sold",
}

export const PRODUCT_STATUS_COLORS: Record<string, string> = {
  in_production: "bg-accent/10 text-accent border-accent/20",
  ready: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  in_transit: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  delivered: "bg-primary/10 text-primary border-primary/20",
  in_stock: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  sold: "bg-muted text-muted-foreground border-border",
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  production: "Production",
  quality_check: "Quality Check",
  packaging: "Packaging",
  shipping: "Shipping",
  received: "Received",
  sold: "Sold",
}

export const EVENT_TYPE_ICONS: Record<string, string> = {
  production: "Factory",
  quality_check: "CheckCircle2",
  packaging: "Package",
  shipping: "Truck",
  received: "PackageCheck",
  sold: "ShoppingCart",
}

export const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  in_transit: "In Transit",
  delivered: "Delivered",
  pending: "Pending",
}

export const SHIPMENT_STATUS_COLORS: Record<string, string> = {
  in_transit: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  delivered: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  pending: "bg-accent/10 text-accent border-accent/20",
}

export const VERIFICATION_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  passed: "Passed",
  failed: "Failed",
}

export const VERIFICATION_STATUS_COLORS: Record<string, string> = {
  pending: "bg-accent/10 text-accent border-accent/20",
  passed: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
}

export const PRIORITY_LABELS: Record<string, string> = {
  high: "High Priority",
  medium: "Medium Priority",
  low: "Low Priority",
}

export const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-accent/10 text-accent border-accent/20",
  low: "bg-muted text-muted-foreground border-border",
}

// Admin-specific constants for user roles
export const USER_ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manufacturer: "Manufacturer",
  distributor: "Distributor",
  retailer: "Retailer",
  verifier: "Verifier",
  none: "No Role",
}

export const USER_ROLE_COLORS: Record<string, string> = {
  admin: "bg-destructive/10 text-destructive border-destructive/20",
  manufacturer: "bg-chart-1/10 text-chart-1 border-chart-1/20",
  distributor: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  retailer: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  verifier: "bg-accent/10 text-accent border-accent/20",
  none: "bg-muted text-muted-foreground border-border",
}

export const USER_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  pending: "Pending",
}

export const USER_STATUS_COLORS: Record<string, string> = {
  active: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  inactive: "bg-muted text-muted-foreground border-border",
  pending: "bg-accent/10 text-accent border-accent/20",
}

// Mock data generators
export function generateMockProducts(): any[] {
  return [
    {
      id: "LOT-20251123-001",
      metadata: {
        product_id: "LOT-20251123-001",
        name: "Dragon Fruit",
        farm: "HTX Thanh Long A",
        harvest_date: "2025-11-20",
        batch_number: "BATCH-001",
        photos: ["ipfs://QmfYffp3wj1nwBRM16Lav4FkfnaitZAYgZqVesiT8kwyXF"],
      },
      status: "ready",
      events: [
        {
          id: "1",
          type: "production",
          description: "Harvest completed",
          location: "HTX Thanh Long A",
          timestamp: "2025-11-20T08:00:00",
          actor: "Manufacturer",
        },
      ],
    },
    {
      id: "LOT-20251120-002",
      metadata: {
        product_id: "LOT-20251120-002",
        name: "Organic Tomato",
        farm: "Organic Farm B",
        harvest_date: "2025-11-18",
        batch_number: "BATCH-002",
        photos: ["ipfs://QmExample123"],
      },
      status: "in_transit",
      events: [
        {
          id: "2",
          type: "shipping",
          description: "Shipped to distributor",
          location: "Distribution Center",
          timestamp: "2025-11-21T10:00:00",
          actor: "Manufacturer",
        },
      ],
    },
  ]
}

export function generateMockShipments(): any[] {
  return [
    {
      id: "SHP-001",
      product_id: "LOT-20251123-001",
      product_name: "Dragon Fruit",
      origin: "HTX Thanh Long A",
      destination: "Ho Chi Minh City",
      quantity: 500,
      status: "in_transit",
      shipped_date: "2025-11-25",
      estimated_arrival: "2025-11-27",
      metadata: {
        product_id: "LOT-20251123-001",
        name: "Dragon Fruit",
        farm: "HTX Thanh Long A",
        harvest_date: "2025-11-20",
        batch_number: "BATCH-001",
        photos: ["ipfs://QmfYffp3wj1nwBRM16Lav4FkfnaitZAYgZqVesiT8kwyXF"],
      },
    },
  ]
}

export function generateMockInventory(): any[] {
  return [
    {
      id: "LOT-20251123-001",
      metadata: {
        product_id: "LOT-20251123-001",
        name: "Dragon Fruit",
        farm: "HTX Thanh Long A",
        harvest_date: "2025-11-20",
        batch_number: "BATCH-001",
        photos: ["ipfs://QmfYffp3wj1nwBRM16Lav4FkfnaitZAYgZqVesiT8kwyXF"],
      },
      status: "in_stock",
      quantity: 45,
      price_per_unit: 35000,
      location: "Store A",
      events: [
        {
          id: "1",
          type: "received",
          description: "Received from distributor",
          location: "Store A",
          timestamp: "2025-11-20T14:00:00",
          actor: "Retailer",
        },
      ],
    },
  ]
}

export function generateMockVerifications(): any[] {
  return [
    {
      id: "LOT-20251123-001",
      metadata: {
        product_id: "LOT-20251123-001",
        name: "Dragon Fruit",
        farm: "HTX Thanh Long A",
        harvest_date: "2025-11-20",
        batch_number: "BATCH-001",
        photos: ["ipfs://QmfYffp3wj1nwBRM16Lav4FkfnaitZAYgZqVesiT8kwyXF"],
      },
      status: "ready",
      submitted_date: "2025-11-25",
      priority: "high",
      events: [
        {
          id: "1",
          type: "production",
          description: "Harvest completed",
          location: "HTX Thanh Long A",
          timestamp: "2025-11-20T08:00:00",
          actor: "Manufacturer",
        },
      ],
    },
    {
      id: "LOT-20251120-002",
      metadata: {
        product_id: "LOT-20251120-002",
        name: "Organic Tomato",
        farm: "Organic Farm B",
        harvest_date: "2025-11-18",
        batch_number: "BATCH-002",
        photos: ["ipfs://QmExample123"],
      },
      status: "ready",
      submitted_date: "2025-11-24",
      priority: "medium",
      events: [
        {
          id: "2",
          type: "production",
          description: "Harvest completed",
          location: "Organic Farm B",
          timestamp: "2025-11-18T09:00:00",
          actor: "Manufacturer",
        },
      ],
    },
    {
      id: "LOT-20251115-003",
      metadata: {
        product_id: "LOT-20251115-003",
        name: "Green Cabbage",
        farm: "HTX Rau Sach C",
        harvest_date: "2025-11-14",
        batch_number: "BATCH-003",
        photos: ["ipfs://QmExample456"],
      },
      status: "ready",
      submitted_date: "2025-11-23",
      priority: "low",
      events: [
        {
          id: "3",
          type: "production",
          description: "Harvest completed",
          location: "HTX Rau Sach C",
          timestamp: "2025-11-14T07:00:00",
          actor: "Manufacturer",
        },
      ],
    },
  ]
}

export function generateMockUsers(): any[] {
  return [
    {
      id: "1",
      address: "0xDDDc08DA813C0D97B918036a386ef3021f04970B",
      name: "John Manufacturer",
      email: "john@manufacturer.com",
      role: "manufacturer",
      status: "active",
      created_at: "2025-01-15",
      last_login: "2025-11-25T10:30:00",
    },
    {
      id: "2",
      address: "0x42EA4CdCc08146a6349cBAA3C5264410EE2441d0",
      name: "Sarah Distributor",
      email: "sarah@distributor.com",
      role: "distributor",
      status: "active",
      created_at: "2025-02-20",
      last_login: "2025-11-24T14:20:00",
    },
    {
      id: "3",
      address: "0x3393DCA4b0C39111C99D82b2090a4db65225b08a",
      name: "Mike Retailer",
      email: "mike@retailer.com",
      role: "retailer",
      status: "active",
      created_at: "2025-03-10",
      last_login: "2025-11-25T09:15:00",
    },
    {
      id: "4",
      address: "0x62172c840574EE91AC3Dde4cC61931c86920e193",
      name: "Emily Verifier",
      email: "emily@verifier.com",
      role: "verifier",
      status: "active",
      created_at: "2025-04-05",
      last_login: "2025-11-23T16:45:00",
    },
    {
      id: "5",
      address: "0x234567890abcdef1234567890abcdef1234567890",
      name: "Pending User",
      email: "pending@example.com",
      role: "none",
      status: "pending",
      created_at: "2025-11-20",
    },
    {
      id: "6",
      address: "0x7890abcdef1234567890abcdef1234567890abcd",
      name: "Inactive User",
      email: "inactive@example.com",
      role: "manufacturer",
      status: "inactive",
      created_at: "2025-05-12",
      last_login: "2025-09-10T12:00:00",
    },
  ]
}
