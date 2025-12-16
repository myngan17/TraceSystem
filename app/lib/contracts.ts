// app/lib/contracts.ts
import { ethers } from "ethers";
import localBuild from "./abi/__local__.json"; // <-- dùng file duy nhất

export const TOKEN_ADDR = process.env.NEXT_PUBLIC_TOKEN_ADDR!;
export const REGISTRY_ADDR = process.env.NEXT_PUBLIC_REGISTRY_ADDR!;

// __local__ structure: it may contain `contracts` keyed by filename or top-level `abi`
// Try a few common shapes safely:
function findAbi(obj: any, contractName: string) {
  // 1) tructure `contracts: { "TraceToken.vy": { abi: [...] }, ... }`
  if (obj?.contracts) {
    for (const key of Object.keys(obj.contracts)) {
      if (key.toLowerCase().includes(contractName.toLowerCase())) {
        return obj.contracts[key].abi;
      }
    }
  }
  // 2) structure { "TraceToken.json": { abi: [...] } }
  if (obj?.contractTypes) {
    // ape __local__ may contain contractTypes mapping -> try to find an "abi" field in top-level
    for (const k of Object.keys(obj.contractTypes)) {
      if (k.toLowerCase().includes(contractName.toLowerCase())) {
        const maybe = obj.contractTypes[k];
        if (maybe?.abi) return maybe.abi;
      }
    }
  }
  // 3) top-level `abi` fallback
  if (obj?.abi) return obj.abi;

  throw new Error("ABI not found for " + contractName);
}

const TokenABI = findAbi(localBuild, "TraceToken");
const RegistryABI = findAbi(localBuild, "ProvenanceRegistry");

export function getToken(providerOrSigner: ethers.Signer | ethers.providers.Provider) {
  return new ethers.Contract(TOKEN_ADDR, TokenABI, providerOrSigner);
}
export function getRegistry(providerOrSigner: ethers.Signer | ethers.providers.Provider) {
  return new ethers.Contract(REGISTRY_ADDR, RegistryABI, providerOrSigner);
}
