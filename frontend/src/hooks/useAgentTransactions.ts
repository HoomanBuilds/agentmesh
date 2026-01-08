import { useQuery } from "@tanstack/react-query";

interface Transaction {
  id: string;
  jobId: string;
  type: "earned" | "spent";
  amount: string;
  counterparty: {
    id: string;
    name: string;
    address?: string;
  };
  description: string;
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

interface TransactionHistoryData {
  transactions: Transaction[];
  stats: TransactionStats;
}

export function useAgentTransactions(agentId: string | null) {
  const query = useQuery<TransactionHistoryData>({
    queryKey: ["agent-transactions", agentId],
    queryFn: async () => {
      if (!agentId) {
        return { transactions: [], stats: { totalJobs: 0, totalEarned: "0", totalSpent: "0" } };
      }

      const res = await fetch(`/api/agents/${agentId}/transactions`);
      if (!res.ok) {
        throw new Error("Failed to fetch transactions");
      }
      return res.json();
    },
    enabled: !!agentId,
    staleTime: 30 * 1000, // 30 seconds
  });

  return {
    transactions: query.data?.transactions ?? [],
    stats: query.data?.stats ?? { totalJobs: 0, totalEarned: "0", totalSpent: "0" },
    loading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
  };
}
