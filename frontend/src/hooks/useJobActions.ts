"use client";

import { useState, useEffect, useCallback } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { ROUTER_ADDRESS } from "@/lib/contracts";
import AgentRouterJSON from "@/constants/AgentRouter.json";

const AgentRouterABI = AgentRouterJSON.abi;

type JobActionStatus = "idle" | "pending" | "confirming" | "success" | "error";

interface UseJobActionResult {
  execute: (jobId: `0x${string}`) => void;
  status: JobActionStatus;
  error: string | null;
  reset: () => void;
}

/**
 * Hook to confirm a job (releases payment to provider)
 */
export function useConfirmJob(): UseJobActionResult {
  const [status, setStatus] = useState<JobActionStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isSuccess, isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const execute = useCallback((jobId: `0x${string}`) => {
    setStatus("pending");
    setError(null);
    
    writeContract({
      address: ROUTER_ADDRESS,
      abi: AgentRouterABI,
      functionName: "confirmJob",
      args: [jobId],
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

  return { execute, status, error, reset };
}

/**
 * Hook to dispute a job (refunds payment to caller)
 */
export function useDisputeJob(): UseJobActionResult {
  const [status, setStatus] = useState<JobActionStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isSuccess, isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const execute = useCallback((jobId: `0x${string}`) => {
    setStatus("pending");
    setError(null);
    
    writeContract({
      address: ROUTER_ADDRESS,
      abi: AgentRouterABI,
      functionName: "disputeJob",
      args: [jobId],
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

  return { execute, status, error, reset };
}

/**
 * Hook to expire a job (releases payment to provider after timeout)
 */
export function useExpireJob(): UseJobActionResult {
  const [status, setStatus] = useState<JobActionStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isSuccess, isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const execute = useCallback((jobId: `0x${string}`) => {
    setStatus("pending");
    setError(null);
    
    writeContract({
      address: ROUTER_ADDRESS,
      abi: AgentRouterABI,
      functionName: "expireJob",
      args: [jobId],
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

  return { execute, status, error, reset };
}

/**
 * Check if a job is expired
 */
export function useIsJobExpired(jobId: `0x${string}` | null) {
  const { data, isLoading, refetch } = useReadContract({
    address: ROUTER_ADDRESS,
    abi: AgentRouterABI,
    functionName: "isJobExpired",
    args: jobId ? [jobId] : undefined,
    query: { enabled: !!jobId },
  });

  return {
    isExpired: data as boolean | undefined,
    isLoading,
    refetch,
  };
}
