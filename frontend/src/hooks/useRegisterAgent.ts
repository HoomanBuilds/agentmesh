"use client";

import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { REGISTRY_ADDRESS } from "@/lib/contracts";
import AgentRegistryJSON from "@/constants/AgentRegistry.json";
import { parseEther } from "viem";
import { useState, useEffect } from "react";

const AgentRegistryABI = AgentRegistryJSON.abi;

type RegisterStatus = "idle" | "pending" | "confirming" | "success" | "error";

interface UseRegisterAgentResult {
  register: (pricePerCall: string, metadataURI: string, walletAddress: string) => void;
  status: RegisterStatus;
  transactionHash?: `0x${string}`;
  error: string | null;
  reset: () => void;
}

/**
 * Hook to register a new agent on-chain
 * @param pricePerCall Price in MNEE per call (e.g. "0.05")
 * @param metadataURI URI pointing to agent metadata
 * @param walletAddress Agent's derived wallet address for receiving payments
 */
export function useRegisterAgent(): UseRegisterAgentResult {
  const [status, setStatus] = useState<RegisterStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const { 
    writeContract, 
    data: hash, 
    isPending, 
    error: writeError 
  } = useWriteContract();
  
  const { isSuccess, isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  function register(pricePerCall: string, metadataURI: string, walletAddress: string) {
    setStatus("pending");
    setError(null);

    writeContract({
      address: REGISTRY_ADDRESS,
      abi: AgentRegistryABI,
      functionName: "registerAgent",
      args: [parseEther(pricePerCall), metadataURI, walletAddress as `0x${string}`],
    });
  }

  useEffect(() => {
    if (writeError) {
      setError(writeError.message);
      setStatus("error");
    }
  }, [writeError]);

  useEffect(() => {
    if (isPending) {
      setStatus("pending");
    }
  }, [isPending]);

  useEffect(() => {
    if (isConfirming) {
      setStatus("confirming");
    }
  }, [isConfirming]);

  useEffect(() => {
    if (isSuccess) {
      setStatus("success");
    }
  }, [isSuccess]);

  function reset() {
    setStatus("idle");
    setError(null);
  }

  return {
    register,
    status,
    transactionHash: hash,
    error,
    reset,
  };
}

/**
 * Get current agent count (useful for determining new agent ID)
 */
export function useAgentCount() {
  const { data, isLoading, refetch } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: AgentRegistryABI,
    functionName: "agentCount",
  });

  return {
    count: data as bigint | undefined,
    isLoading,
    refetch,
  };
}
