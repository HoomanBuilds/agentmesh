import contractAddresses from "@/constants/contractAddresses.json";

// Get the current chain ID from environment
export const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID || "11155111";

type ChainId = keyof typeof contractAddresses;

// Default RPC URLs
const DEFAULT_RPC_URLS: Record<string, string> = {
  "11155111": "https://rpc.sepolia.org", 
  "1": "https://eth.llamarpc.com",         
};

/**
 * Get the RPC URL for the current chain
 * Priority:
 * 1. RPC_URL env var (server-side) or NEXT_PUBLIC_RPC_URL (client-side)
 * 2. Default public RPC for the chain
 */
export function getRpcUrl(): string {
  if (process.env.NEXT_PUBLIC_RPC_URL) return process.env.NEXT_PUBLIC_RPC_URL;
  
  if (process.env.RPC_URL) return process.env.RPC_URL;

  const defaultRpc = DEFAULT_RPC_URLS[CHAIN_ID];
  if (!defaultRpc) {
    console.warn(`No RPC URL configured for chain ${CHAIN_ID}`);
    return "";
  }

  return defaultRpc;
}

// Get contract addresses for the current chain
export function getContractAddresses() {
  const addresses = contractAddresses[CHAIN_ID as ChainId];
  
  if (!addresses) {
    console.warn(`No contract addresses found for chain ${CHAIN_ID}`);
    return {
      MockMNEE: "0x0000000000000000000000000000000000000000",
      AgentRegistry: "0x0000000000000000000000000000000000000000",
      AgentEscrow: "0x0000000000000000000000000000000000000000",
      AgentRouter: "0x0000000000000000000000000000000000000000",
    };
  }
  
  return addresses;
}

// Export individual addresses for convenience
export const MNEE_ADDRESS = getContractAddresses().MockMNEE as `0x${string}`;
export const REGISTRY_ADDRESS = getContractAddresses().AgentRegistry as `0x${string}`;
export const ESCROW_ADDRESS = getContractAddresses().AgentEscrow as `0x${string}`;
export const ROUTER_ADDRESS = getContractAddresses().AgentRouter as `0x${string}`;
