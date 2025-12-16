// app/lib/loadProducts.ts
import { ethers } from "ethers";
import localBuild from "./abi/__local__.json";

const EVENT_NAME = "ProductRegistered"; // nếu event tên khác, sửa ở đây

// Try to find the Registry ABI in various shapes of __local__.json
function findRegistryAbi(obj: any) {
  if (!obj) return null;
  // common shapes:
  // 1) obj.contracts?.["ProvenanceRegistry.vy"]?.abi
  if (obj.contracts) {
    for (const k of Object.keys(obj.contracts)) {
      if (k.toLowerCase().includes("provenanceregistry")) {
        return obj.contracts[k].abi;
      }
    }
  }
  // 2) obj.contractTypes (ape/forge style)
  if (obj.contractTypes) {
    for (const k of Object.keys(obj.contractTypes)) {
      if (k.toLowerCase().includes("provenanceregistry")) {
        const maybe = obj.contractTypes[k];
        if (maybe?.abi) return maybe.abi;
      }
    }
  }
  // 3) top-level mapping by file name
  for (const k of Object.keys(obj)) {
    if (k.toLowerCase().includes("provenanceregistry") && obj[k]?.abi) return obj[k].abi;
  }
  // 4) fallback to top-level abi (if file contains single abi)
  if (obj.abi) return obj.abi;
  return null;
}

const registryAbi = findRegistryAbi(localBuild);
if (!registryAbi) {
  throw new Error("Could not locate ProvenanceRegistry ABI in ./abi/__local__.json");
}

// safe hex -> utf8 string (removes trailing zeros)
function hexToUtf8Safe(hex: string) {
  if (!hex) return "";
  try {
    // ethers v6
    if ((ethers as any).toUtf8String) {
      return (ethers as any).toUtf8String(hex).replace(/\0+$/g, "");
    }
  } catch {}
  // fallback manual
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const buf = Buffer.from(clean, "hex");
  return buf.toString("utf8").replace(/\0+$/g, "");
}

// Build topic0 robustly (compat with different ethers versions)
function computeEventTopic(iface: any, eventFragment: any) {
  // prefer iface.getEventTopic if exists
  if (typeof iface.getEventTopic === "function") {
    try {
      return iface.getEventTopic(eventFragment);
    } catch (e) {
      // continue to fallback
    }
  }

  // fallback: build signature "EventName(type1,type2,...)"
  const inputs = (eventFragment.inputs || []).map((i: any) => i.type).join(",");
  const signature = `${eventFragment.name}(${inputs})`;
  // Try ethers.keccak256 + toUtf8Bytes (ethers v6)
  try {
    if ((ethers as any).keccak256 && (ethers as any).toUtf8Bytes) {
      return (ethers as any).keccak256((ethers as any).toUtf8Bytes(signature));
    }
  } catch {}
  // fallback to ethers.id (v5)
  try {
    if ((ethers as any).id) {
      return (ethers as any).id(signature);
    }
  } catch {}
  // last resort: use keccak256 from utils if present
  if ((ethers as any).utils && (ethers as any).utils.id) {
    return (ethers as any).utils.id(signature);
  }
  throw new Error("Cannot compute event topic for signature: " + signature);
}

export async function loadProductsFromChain(opts?: {
  rpcUrl?: string;
  registryAddress?: string;
  fromBlock?: number;
}) {
  const rpcUrl = opts?.rpcUrl || process.env.NEXT_PUBLIC_RPC_URL;
  const registryAddress = opts?.registryAddress || process.env.NEXT_PUBLIC_REGISTRY_ADDR;
  const fromBlock = opts?.fromBlock ?? Number(process.env.NEXT_PUBLIC_FROM_BLOCK || 0);

  if (!rpcUrl) throw new Error("Missing RPC URL (NEXT_PUBLIC_RPC_URL)");
  if (!registryAddress) throw new Error("Missing registry address (NEXT_PUBLIC_REGISTRY_ADDR)");

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  // create Interface with found ABI
  const iface = new ethers.Interface(registryAbi);

  // find event fragment (robust)
  let eventFragment: any = null;
  try {
    eventFragment = iface.getEvent(EVENT_NAME);
  } catch {
    // fallback search by name (case-insensitive)
    const evs = (iface as any).events ? Object.values((iface as any).events) : [];
    eventFragment = evs.find((f: any) => f && f.name && f.name.toLowerCase() === EVENT_NAME.toLowerCase());
    if (!eventFragment) {
      // try contains
      eventFragment = evs.find((f: any) => f && f.name && f.name.toLowerCase().includes(EVENT_NAME.toLowerCase()));
    }
    if (!eventFragment) throw new Error(`Event ${EVENT_NAME} not found in ABI`);
  }

  // compute topic0 robustly
  const topic0 = computeEventTopic(iface, eventFragment);

  const filter: any = {
    address: registryAddress,
    topics: [topic0],
    fromBlock,
    toBlock: "latest",
  };

  const logs = await provider.getLogs(filter);
  const products: any[] = [];

  // contract instance (for view calls)
  const registry = new ethers.Contract(registryAddress, registryAbi, provider);

  for (const log of logs) {
    let parsed: any;
    try {
      parsed = iface.parseLog(log);
    } catch (e) {
      // parseLog can fail for some ABI shapes; skip this log if cannot parse
      console.warn("Failed to parse log with iface.parseLog:", e, log);
      continue;
    }

    const pidBytes = parsed.args[0];
    const owner = parsed.args[1];
    const cidBytes = parsed.args[2];

    // pid decode
    let pid = "";
    try {
      if (typeof pidBytes === "string") pid = hexToUtf8Safe(pidBytes);
      else pid = hexToUtf8Safe(ethers.hexlify(pidBytes));
    } catch (e) {
      pid = "";
    }

    // cid decode
    let cid = "";
    try {
      if (typeof cidBytes === "string") cid = hexToUtf8Safe(cidBytes);
      else cid = hexToUtf8Safe(ethers.hexlify(cidBytes));
      cid = cid.replace(/^ipfs:\/\//, "");
    } catch (e) {
      // fallback: call view get_product to read stored metadata_cid
      try {
        const info = await registry.get_product(pidBytes);
        const metadata_raw = info[2];
        cid = hexToUtf8Safe(ethers.hexlify(metadata_raw)).replace(/^ipfs:\/\//, "");
      } catch (e2) {
        cid = "";
      }
    }

    // fetch metadata JSON from IPFS (if available)
    let metadata: any = null;
    if (cid) {
      try {
        const res = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
        if (res.ok) metadata = await res.json();
        else metadata = { error: `IPFS ${res.status}` };
      } catch (e) {
        metadata = { error: String(e) };
      }
    }

    // events_count via view if possible
    let events_count = 0;
    try {
      const gp = await registry.get_product(pidBytes);
      events_count = gp && gp[3] ? Number(gp[3]) : 0;
    } catch {}

    products.push({
      pid,
      owner,
      cid,
      metadata,
      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
      events_count,
    });
  }

  // newest first
  products.sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber));
  return products;
}
