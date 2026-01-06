"use client";

import { useReadContract } from "wagmi";
import { ROUTER_ADDRESS, REGISTRY_ADDRESS } from "@/lib/contracts";
import AgentRouterJSON from "@/constants/AgentRouter.json";
import AgentRegistryJSON from "@/constants/AgentRegistry.json";

const AgentRouterABI = AgentRouterJSON.abi;
const AgentRegistryABI = AgentRegistryJSON.abi;

/**
 * Get platform statistics from AgentRouter
 */
export function usePlatformStats() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: ROUTER_ADDRESS,
    abi: AgentRouterABI,
    functionName: "getPlatformStats",
  });

  const stats = data as [bigint, bigint, bigint] | undefined;

  return {
    totalJobs: stats?.[0] ?? BigInt(0),
    completedJobs: stats?.[1] ?? BigInt(0),
    totalVolume: stats?.[2] ?? BigInt(0),
    isLoading,
    error,
    refetch,
  };
}

/**
 * Get agent count from registry
 */
export function useAgentCount() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: AgentRegistryABI,
    functionName: "agentCount",
  });

  return {
    count: data as bigint | undefined,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Get on-chain agent data
 */
export function useOnchainAgent(agentId: number | null) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: AgentRegistryABI,
    functionName: "getAgent",
    args: agentId !== null ? [BigInt(agentId)] : undefined,
    query: { enabled: agentId !== null },
  });

  const agent = data as
    | {
        owner: `0x${string}`;
        pricePerCall: bigint;
        active: boolean;
        metadataURI: string;
      }
    | undefined;

  return {
    agent,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Get job details from router
 */
export function useJob(jobId: `0x${string}` | null) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: ROUTER_ADDRESS,
    abi: AgentRouterABI,
    functionName: "getJob",
    args: jobId ? [jobId] : undefined,
    query: { enabled: !!jobId },
  });

  const job = data as
    | {
        callerAgentId: bigint;
        providerAgentId: bigint;
        callerWallet: `0x${string}`;
        amount: bigint;
        createdAt: bigint;
        status: number;
      }
    | undefined;

  return {
    job,
    isLoading,
    error,
    refetch,
  };
}
