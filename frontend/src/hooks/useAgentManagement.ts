"use client";

import { useState, useEffect, useCallback } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from "wagmi";
import { parseEther } from "viem";
import { REGISTRY_ADDRESS, ROUTER_ADDRESS } from "@/lib/contracts";
import AgentRegistryJSON from "@/constants/AgentRegistry.json";
import AgentRouterJSON from "@/constants/AgentRouter.json";

const AgentRegistryABI = AgentRegistryJSON.abi;
const AgentRouterABI = AgentRouterJSON.abi;

type UpdateStatus = "idle" | "pending" | "confirming" | "success" | "error";

interface UseUpdateAgentResult {
  update: (agentId: number, newPrice: string, active: boolean, metadataURI?: string) => void;
  status: UpdateStatus;
  error: string | null;
  reset: () => void;
}

/**
 * Hook to update an existing agent
 */
export function useUpdateAgent(): UseUpdateAgentResult {
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isSuccess, isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const update = useCallback((agentId: number, newPrice: string, active: boolean, metadataURI: string = "") => {
    setStatus("pending");
    setError(null);
    
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: AgentRegistryABI,
      functionName: "updateAgent",
      args: [BigInt(agentId), parseEther(newPrice), active, metadataURI],
    });
  }, [writeContract]);

  useEffect(() => {
    if (writeError) {
      setError(writeError.message);
      setStatus("error");
    }
  }, [writeError]);

  useEffect(() => {
    if (isPending) setStatus("pending");
    if (isConfirming) setStatus("confirming");
    if (isSuccess) setStatus("success");
  }, [isPending, isConfirming, isSuccess]);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return { update, status, error, reset };
}

/**
 * Hook to get agents by owner address
 */
export function useAgentsByOwner(owner?: `0x${string}`) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: ROUTER_ADDRESS,
    abi: AgentRouterABI,
    functionName: "getAgentsByOwner",
    args: owner ? [owner] : undefined,
    query: { enabled: !!owner },
  });

  return {
    agentIds: data as bigint[] | undefined,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get current user's agents
 */
export function useMyAgents() {
  const { address } = useAccount();
  return useAgentsByOwner(address);
}

/**
 * Hook to get escrow statistics
 */
export function useEscrowStats() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: ROUTER_ADDRESS,
    abi: AgentRouterABI,
    functionName: "getEscrowStats",
  });

  const stats = data as [bigint, bigint, bigint, bigint, bigint, bigint] | undefined;

  return {
    totalCreated: stats?.[0] ?? BigInt(0),
    totalCompleted: stats?.[1] ?? BigInt(0),
    totalDisputed: stats?.[2] ?? BigInt(0),
    totalExpired: stats?.[3] ?? BigInt(0),
    pending: stats?.[4] ?? BigInt(0),
    escrowBalance: stats?.[5] ?? BigInt(0),
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get job timeout
 */
export function useJobTimeout() {
  const { data, isLoading } = useReadContract({
    address: ROUTER_ADDRESS,
    abi: AgentRouterABI,
    functionName: "getJobTimeout",
  });

  return {
    timeout: data as bigint | undefined,
    isLoading,
  };
}
