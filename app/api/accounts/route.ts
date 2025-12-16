// app/api/accounts/route.ts
import fs from "fs"
import path from "path"
import { NextResponse } from "next/server"
import { ethers } from "ethers"


// helper để tìm ABI trong artifact __local__.json hoặc ProvenanceRegistry.json
function findRegistryAbi(obj: any): any | null {
  if (!obj) return null
  if (Array.isArray(obj.abi)) return obj.abi

  if (obj.contracts && typeof obj.contracts === "object") {
    const tryNames = ["ProvenanceRegistry", "ProvenanceRegistry.vy", "ProvenanceRegistry.json", "provenanceregistry"]
    for (const name of tryNames) {
      if (obj.contracts[name] && Array.isArray(obj.contracts[name].abi)) return obj.contracts[name].abi
    }
    for (const k of Object.keys(obj.contracts)) {
      const entry = obj.contracts[k]
      if (entry && Array.isArray(entry.abi)) return entry.abi
    }
  }

  if (obj.contractTypes && typeof obj.contractTypes === "object") {
    for (const k of Object.keys(obj.contractTypes)) {
      const ct = obj.contractTypes[k]
      if (ct && Array.isArray(ct.abi)) return ct.abi
    }
  }

  for (const k of Object.keys(obj)) {
    const val = obj[k]
    if (val && Array.isArray(val.abi)) return val.abi
  }

  return null
}

const ROLE_LABELS: Record<number, string> = {
  0: "none",
  1: "manufacturer",
  2: "distributor",
  3: "retailer",
  4: "verifier",
}

export async function GET() {
  try {
    // where developer places ape accounts for dev
    const accountsPath =
      process.env.APE_ACCOUNTS_PATH ??
      path.join(process.cwd(), "data", "ape-accounts.json")

    if (!fs.existsSync(accountsPath)) {
      return NextResponse.json(
        { error: `file not found: ${accountsPath}. Tạo file data/ape-accounts.json hoặc set APE_ACCOUNTS_PATH` },
        { status: 404 }
      )
    }

    const raw = fs.readFileSync(accountsPath, "utf8")
    let parsed: any = {}
    try {
      parsed = JSON.parse(raw)
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON in ape-accounts.json" }, { status: 500 })
    }

    // expected shape: either { manufacturer: { address, private_key }, ... } OR array [{ address, private_key, label }]
    let accounts: any[] = []

    if (Array.isArray(parsed)) {
      accounts = parsed.map((a: any, idx: number) => ({
        id: a.id ?? `acct-${idx}`,
        label: a.label ?? a.id ?? a.address ?? `acct-${idx}`,
        address: (a.address || "").toLowerCase(),
        private_key: a.private_key ?? a.key ?? null,
      }))
    } else {
      // object map
      accounts = Object.keys(parsed).map((k) => {
        const v = parsed[k] || {}
        return {
          id: k,
          label: k,
          address: (v.address || "").toLowerCase(),
          private_key: v.private_key ?? v.key ?? null,
        }
      })
    }

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || process.env.RPC_URL || null
    const registryAddress = process.env.NEXT_PUBLIC_REGISTRY_ADDR || null

    // if RPC + registry provided, try to call contract.roles(address) for each account
    if (rpcUrl && registryAddress) {
      // try to load local artifact for ABI (if present)
      let abi: any = null
      try {
        // try __local__.json or ProvenanceRegistry.json in app/lib/abi
        const candidatePaths = [
          path.join(process.cwd(), "app", "lib", "abi", "__local__.json"),
          path.join(process.cwd(), "app", "lib", "abi", "ProvenanceRegistry.json"),
          path.join(process.cwd(), "lib", "abi", "ProvenanceRegistry.json"),
        ]
        for (const p of candidatePaths) {
          if (fs.existsSync(p)) {
            const content = JSON.parse(fs.readFileSync(p, "utf8"))
            const found = findRegistryAbi(content)
            if (found) { abi = found; break }
            // fallback if file itself is abi array
            if (Array.isArray(content)) { abi = content; break }
          }
        }
      } catch (e) {
        // ignore
      }

      if (abi) {
        try {
          const provider = new ethers.JsonRpcProvider(rpcUrl)
          const registry = new ethers.Contract(registryAddress, abi, provider)

          // get roles for each address in parallel (bounded)
          const promises = accounts.map(async (a) => {
            const out: any = { ...a }
            try {
              // contract public mapping generated fn is `roles(address)` in your Vyper -> view returns uint256
              const rn = await registry.roles(a.address).catch(() => null)
              const roleNum = rn != null ? Number(rn) : null
              out.roleNum = roleNum
              out.roleLabel = roleNum != null && ROLE_LABELS[roleNum] ? ROLE_LABELS[roleNum] : (out.roleLabel || "none")
            } catch (e) {
              out.roleNum = null
              out.roleLabel = out.roleLabel || "none"
            }
            // don't return private_key to client
            delete out.private_key
            return out
          })

          const enriched = await Promise.all(promises)
          return NextResponse.json({ accounts: enriched })
        } catch (e) {
          // failed to call chain -> return accounts without roles but not private keys
          const safe = accounts.map((a) => {
            const c = { ...a }
            delete c.private_key
            return c
          })
          return NextResponse.json({ accounts: safe, warning: "failed to call chain to fetch roles", chainError: String(e) })
        }
      }
    }

    // fallback: return accounts (without private_key)
    const safe = accounts.map((a) => {
      const c = { ...a }
      delete c.private_key
      return c
    })
    return NextResponse.json({ accounts: safe })
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
