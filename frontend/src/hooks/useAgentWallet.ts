"use client";

import { useState, useEffect, useCallback } from "react";

interface AgentWalletInfo {
  address: string;
  mneeBalance: string;
  ethBalance: string;
  agentId: number;
}

/**
 * Hook to get agent wallet information
 */
export function useAgentWallet(agentId: number | null) {
  const [wallet, setWallet] = useState<AgentWalletInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWallet = useCallback(async () => {
    if (agentId === null) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const res = await fetch(`/api/agent-wallet/info?agentId=${agentId}`);
      const { data, error: apiError } = await res.json();

      if (apiError) {
        setError(apiError);
      } else {
        setWallet(data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch wallet info");
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  return {
    wallet,
    isLoading,
    error,
    refetch: fetchWallet,
  };
}

/**
 * Hook to withdraw from agent wallet
 */
export function useAgentWithdraw() {
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const withdraw = useCallback(async (agentId: number, amount?: string, toAddress?: string) => {
    try {
      setIsWithdrawing(true);
      setError(null);
      setTxHash(null);

      const res = await fetch("/api/agent-wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, amount, toAddress }),
      });

      const { data, error: apiError } = await res.json();

      if (apiError) {
        setError(apiError);
        return false;
      }

      setTxHash(data.hash);
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to withdraw");
      return false;
    } finally {
      setIsWithdrawing(false);
    }
  }, []);

  return {
    withdraw,
    isWithdrawing,
    error,
    txHash,
  };
}
