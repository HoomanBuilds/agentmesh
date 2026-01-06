import contractAddresses from "@/constants/contractAddresses.json";

// Get the current chain ID from environment
const chainId = process.env.NEXT_PUBLIC_CHAIN_ID || "11155111";

type ChainId = keyof typeof contractAddresses;

// Get contract addresses for the current chain
export function getContractAddresses() {
  const addresses = contractAddresses[chainId as ChainId];
  
  if (!addresses) {
    console.warn(`No contract addresses found for chain ${chainId}`);
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
