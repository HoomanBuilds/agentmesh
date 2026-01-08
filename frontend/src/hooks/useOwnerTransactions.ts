"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys, cacheConfig } from "@/lib/queryKeys";

interface Transaction {
  id: string;
  jobId: string;
  type: "earned" | "spent";
  amount: string;
  ownedAgent: {
    id: string;
    name: string;
  };
  counterparty: {
    id: string;
    name: string;
  };
  status: string;
  txHash: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface TransactionStats {
  totalJobs: number;
  totalEarned: string;
  totalSpent: string;
}

interface OwnerTransactionsResponse {
  transactions: Transaction[];
  stats: TransactionStats;
}

async function fetchOwnerTransactions(ownerAddress: string): Promise<OwnerTransactionsResponse> {
  const res = await fetch(`/api/transactions/owner?ownerAddress=${ownerAddress}`);
  if (!res.ok) {
    throw new Error("Failed to fetch transactions");
  }
  return res.json();
}

/**
 * Hook to fetch combined transaction history for all agents owned by a user
 */
export function useOwnerTransactions(ownerAddress: string | undefined) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.transactions.byOwner(ownerAddress || ""),
    queryFn: () => fetchOwnerTransactions(ownerAddress!),
    staleTime: cacheConfig.agents.staleTime,
    gcTime: cacheConfig.agents.gcTime,
    enabled: !!ownerAddress,
  });

  return {
    transactions: data?.transactions || [],
    stats: data?.stats || { totalJobs: 0, totalEarned: "0", totalSpent: "0" },
    loading: isLoading,
    error: error?.message || null,
    refetch,
  };
}
