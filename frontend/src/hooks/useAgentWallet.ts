"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys, cacheConfig } from "@/lib/queryKeys";

interface AgentWalletInfo {
  address: string;
  mneeBalance: string;
  ethBalance: string;
  agentId: number;
}

async function fetchWalletInfo(agentId: number): Promise<AgentWalletInfo> {
  const res = await fetch(`/api/agent-wallet/info?agentId=${agentId}`);
  const { data, error } = await res.json();
  if (error) throw new Error(error);
  return data;
}

/**
 * Hook to get agent wallet information with caching (30s stale time)
 */
export function useAgentWallet(agentId: number | null) {
  const queryClient = useQueryClient();

  const { 
    data: wallet = null, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: queryKeys.agentWallet.info(agentId || 0),
    queryFn: () => fetchWalletInfo(agentId!),
    staleTime: cacheConfig.wallet.staleTime,
    gcTime: cacheConfig.wallet.gcTime,
    refetchOnWindowFocus: true, 
    enabled: agentId !== null,
  });

  return {
    wallet,
    isLoading,
    error: error?.message || null,
    refetch,
    // Force refresh after transaction
    invalidate: () => queryClient.invalidateQueries({ 
      queryKey: queryKeys.agentWallet.info(agentId || 0) 
    }),
  };
}

/**
 * Hook to withdraw from agent wallet
 * SECURITY: Requires ownerAddress for verification
 */
export function useAgentWithdraw() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ 
      agentId, 
      ownerAddress,
      amount, 
      toAddress 
    }: { 
      agentId: number; 
      ownerAddress: string;
      amount?: string; 
      toAddress?: string 
    }) => {
      const res = await fetch("/api/agent-wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, ownerAddress, amount, toAddress }),
      });

      const { data, error } = await res.json();
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate wallet cache after successful withdrawal
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.agentWallet.info(variables.agentId) 
      });
    },
  });

  const withdraw = async (agentId: number, ownerAddress: string, amount?: string, toAddress?: string) => {
    try {
      await mutation.mutateAsync({ agentId, ownerAddress, amount, toAddress });
      return true;
    } catch {
      return false;
    }
  };

  return {
    withdraw,
    isWithdrawing: mutation.isPending,
    error: mutation.error?.message || null,
    txHash: mutation.data?.hash || null,
  };
}

