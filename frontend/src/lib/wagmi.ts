import { http, createConfig } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { CHAIN_ID, getRpcUrl } from "./contracts";

const chainId = parseInt(CHAIN_ID);

// Chain configuration based on environment
const getChains = () => {
  if (chainId === 1) {
    return [mainnet] as const;
  }
  return [sepolia] as const;
};

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo";

// Get the configured RPC URL
const rpcUrl = getRpcUrl();

export const config = getDefaultConfig({
  appName: "AgentMesh",
  projectId,
  chains: getChains(),
  ssr: true,
  transports: {
    [mainnet.id]: http(chainId === 1 ? rpcUrl : undefined),
    [sepolia.id]: http(chainId === 11155111 ? rpcUrl : undefined),
  },
});

export const CURRENT_CHAIN_ID = chainId;
