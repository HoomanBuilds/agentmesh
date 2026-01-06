"use client";

import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ROUTER_ADDRESS, MNEE_ADDRESS, ESCROW_ADDRESS }from "@/lib/contracts";
import AgentRouterJSON from "@/constants/AgentRouter.json";
import MockMNEEJSON from "@/constants/MockMNEE.json";

const AgentRouterABI = AgentRouterJSON.abi;
const MockMNEEABI = MockMNEEJSON.abi;

type ServiceStatus = "idle" | "approving" | "requesting" | "success" | "error";

interface UseRequestServiceResult {
  requestService: (providerAgentId: number, price: bigint, callerAgentId?: number) => void;
  jobId: string | null;
  status: ServiceStatus;
  error: string | null;
  reset: () => void;
}

/**
 * Hook for requesting agent service (approve MNEE + call requestService)
 */
export function useRequestService(): UseRequestServiceResult {
  const [status, setStatus] = useState<ServiceStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [providerAgentId, setProviderAgentId] = useState<number | null>(null);
  const [callerAgentId, setCallerAgentId] = useState<number>(0);

  const { 
    writeContract: approve, 
    data: approveHash, 
    error: approveError 
  } = useWriteContract();
  
  const { 
    writeContract: request, 
    data: requestHash, 
    error: requestError 
  } = useWriteContract();

  const { isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isSuccess: requestSuccess, data: requestReceipt } = useWaitForTransactionReceipt({ hash: requestHash });

  function requestService(providerAgentIdArg: number, price: bigint, callerAgentIdArg: number = 0) {
    setStatus("approving");
    setError(null);
    setJobId(null);
    setProviderAgentId(providerAgentIdArg);
    setCallerAgentId(callerAgentIdArg);

    approve({
      address: MNEE_ADDRESS,
      abi: MockMNEEABI,
      functionName: "approve",
      args: [ESCROW_ADDRESS, price],
    });
  }

  // Handle approve error
  useEffect(() => {
    if (approveError) {
      setError(approveError.message);
      setStatus("error");
    }
  }, [approveError]);

  // After approval, call requestService
  useEffect(() => {
    if (approveSuccess && status === "approving" && providerAgentId !== null) {
      setStatus("requesting");
      request({
        address: ROUTER_ADDRESS,
        abi: AgentRouterABI,
        functionName: "requestService",
        args: [BigInt(providerAgentId), BigInt(callerAgentId)],
      });
    }
  }, [approveSuccess, status, providerAgentId, callerAgentId, request]);

  // Handle request error
  useEffect(() => {
    if (requestError) {
      setError(requestError.message);
      setStatus("error");
    }
  }, [requestError]);

  // Extract jobId from receipt
  useEffect(() => {
    if (requestSuccess && requestReceipt && status === "requesting") {
      const routerLog = requestReceipt.logs.find(
        (log) => log.address.toLowerCase() === ROUTER_ADDRESS.toLowerCase()
      );
      
      if (routerLog && routerLog.topics[1]) {
        setJobId(routerLog.topics[1] as string);
        setStatus("success");
      } else {
        setError("Failed to extract jobId from transaction");
        setStatus("error");
      }
    }
  }, [requestSuccess, requestReceipt, status]);

  function reset() {
    setStatus("idle");
    setError(null);
    setJobId(null);
    setProviderAgentId(null);
  }

  return {
    requestService,
    jobId,
    status,
    error,
    reset,
  };
}
