"use client";

import { ethers } from "ethers";
import Web3Modal from "web3modal";

let rpcProvider: any = null;   // provider dùng để đọc/submit RPC (Infura/Alchemy... do bạn cấu hình)
let signer: any = null;        // signer lấy từ MetaMask (ký tx)
let browserProvider: any = null; // wrapper cho window.ethereum

// Helper tạo rpcProvider từ env (hỗ trợ 1 hoặc nhiều URL)
// hex chainId của Sepolia = 0xAA36A7 (decimal 11155111)
async function ensureSepolia() {
  if (!(window as any).ethereum) throw new Error("MetaMask not found");
  try {
    await (window as any).ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0xAA36A7" }],
    });
    // switched
    return true;
  } catch (switchError: any) {
    // 4902 = chain not added
    if (switchError.code === 4902) {
      try {
        // Thêm Sepolia vào MetaMask (ví dụ dùng Infura RPC)
        await (window as any).ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: "0xAA36A7",
            chainName: "Sepolia Testnet",
            rpcUrls: ["https://sepolia.infura.io/v3/4ebd0771a0584d69abac12780d483a5c"],
            nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
            blockExplorerUrls: ["https://sepolia.etherscan.io"]
          }],
        });
        return true;
      } catch (addError) {
        console.error("Failed to add Sepolia:", addError);
        return false;
      }
    } else {
      console.error("Failed to switch network:", switchError);
      return false;
    }
  }
}

function createRpcProviderFromEnv() {
  try {
    // Hỗ trợ NEXT_PUBLIC_RPC_URL (1 URL) hoặc NEXT_PUBLIC_RPC_URLS (danh sách phân cách bằng dấu phẩy)
    const urlsEnv = process.env.NEXT_PUBLIC_RPC_URLS || process.env.NEXT_PUBLIC_RPC_URL || "";
    const urls = urlsEnv.split(",").map(s => s.trim()).filter(Boolean);

    if (urls.length === 0) return null;

    const providers = urls.map(u => new ethers.JsonRpcProvider(u));

    if (providers.length === 1) {
      return providers[0];
    }

    // Nếu Ethers hỗ trợ FallbackProvider ở runtime, dùng nó; còn không thì dùng providers[0]
    try {
      const FallbackProvider = (ethers as any).FallbackProvider ?? (ethers as any).providers?.FallbackProvider;
      if (FallbackProvider) {
        // Một số API FallbackProvider nhận array hoặc một cấu hình, để đơn giản truyền array providers
        return new FallbackProvider(providers);
      } else {
        return providers[0];
      }
    } catch (e) {
      return providers[0];
    }
  } catch (e) {
    console.warn("createRpcProviderFromEnv error:", e);
    return null;
  }
}

export async function connectWallet() {
  if (typeof window === "undefined") {
    return { error: "connectWallet must run in browser" };
  }
  if (!(window as any).ethereum) {
    return { error: "MetaMask not found" };
  }

  try {
    const web3Modal = new Web3Modal({ cacheProvider: false });
    await web3Modal.clearCachedProvider();

    let connection: any = null;

    try {
      connection = await web3Modal.connect();
    } catch (err) {
      console.warn("web3modal failed, fallback -> window.ethereum");
      await (window as any).ethereum.request?.({ method: "eth_requestAccounts" });
      connection = (window as any).ethereum;
    }

    // BrowserProvider (ethers v6) or Web3Provider (v5)
    if ((ethers as any).BrowserProvider) {
      browserProvider = new (ethers as any).BrowserProvider(connection);
      signer = await browserProvider.getSigner();
    } else {
      browserProvider = new (ethers as any).providers.Web3Provider(connection);
      signer = browserProvider.getSigner();
    }

    // TẠO rpcProvider từ env (Infura/Alchemy). Nếu không có, fallback về browserProvider
    const envRpc = createRpcProviderFromEnv();
    rpcProvider = envRpc ?? browserProvider;

    const address = await signer.getAddress();
    // Sau khi lấy network từ MetaMask
    const network = await browserProvider.getNetwork?.();
    console.log("Signer network:", network);

    // Nếu không phải Sepolia → yêu cầu chuyển mạng
    if (network.chainId !== 11155111n) {
      console.warn("⚠ MetaMask đang không ở Sepolia. Đang yêu cầu chuyển mạng...");

      const ok = await ensureSepolia();
      if (!ok) {
        return {
          error: "Không thể chuyển mạng sang Sepolia. Hãy mở MetaMask và chọn Sepolia."
        };
      }

      // Cập nhật lại provider sau khi mạng đã được chuyển
      const newNetwork = await browserProvider.getNetwork();
      console.log("Switched to:", newNetwork);
    }


    // --- DEBUG: expose ra window để test nhanh trong Console (remove in prod) ---
    if (typeof window !== "undefined") {
      (window as any).__SIGNER = signer;
      (window as any).__RPC_PROVIDER = rpcProvider;
      (window as any).__BROWSER_PROVIDER = browserProvider;
    }

    // --- DEBUG: in nonce pending/latest để bạn biết trạng thái ngay ---
    try {
      const pending = await (rpcProvider ?? browserProvider).getTransactionCount(address, "pending");
      const latest = await (rpcProvider ?? browserProvider).getTransactionCount(address, "latest");
      console.log("addr:", address, "pending:", pending, "latest:", latest);
    } catch (e) {
      console.warn("Không lấy được nonce:", e);
    }

    console.log("Connected address:", address);
    console.log("Signer network (from MetaMask):", network);
    console.log("RPC provider used:", envRpc ? "env RPC(s)" : "MetaMask RPC (browser)");

    return {
      provider: rpcProvider,    // provider mà app sẽ dùng để read/submit (Infura/Alchemy nếu có)
      signer,                   // signer từ MetaMask để ký tx
      address,
      chainId: network?.chainId,
      rpcFromEnv: !!envRpc,
    };
  } catch (e: any) {
    console.error("connectWallet error:", e);
    return { error: e?.message || "Unknown wallet error" };
  }
}


export function getSigner() {
  return signer;
}
export function getProvider() {
  return rpcProvider;
}
export function getBrowserProvider() {
  return browserProvider;
}
