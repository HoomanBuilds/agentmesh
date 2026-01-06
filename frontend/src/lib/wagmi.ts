import { http, createConfig } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "11155111");

// Chain configuration based on environment
const getChains = () => {
  if (chainId === 1) {
    return [mainnet] as const;
  }
  return [sepolia] as const;
};

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo";

export const config = getDefaultConfig({
  appName: "AgentPay Router",
  projectId,
  chains: getChains(),
  ssr: true,
});

export const CURRENT_CHAIN_ID = chainId;

export const RPC_URLS: Record<number, string> = {
  1: "https://eth.llamarpc.com",
  11155111: "https://rpc.sepolia.org",
};
