/**
 * Centralized query keys for React Query caching
 * Use these keys for consistent cache invalidation
 */
export const queryKeys = {
  agents: {
    all: ["agents"] as const,
    list: (params?: { owner?: string; search?: string }) => 
      ["agents", "list", params] as const,
    detail: (id: string) => ["agents", "detail", id] as const,
    byOwner: (owner: string) => ["agents", "byOwner", owner] as const,
  },
  agentWallet: {
    info: (agentId: number) => ["agentWallet", "info", agentId] as const,
  },
  transactions: {
    byAgent: (agentId: string) => ["transactions", "byAgent", agentId] as const,
    byOwner: (owner: string) => ["transactions", "byOwner", owner] as const,
  },
};

/**
 * Cache configuration
 */
export const cacheConfig = {
  // 5 minutes for agent data (rarely changes)
  agents: {
    staleTime: 5 * 60 * 1000, 
    gcTime: 10 * 60 * 1000, 
  },
  // 30 seconds for wallet balance (changes with transactions)
  wallet: {
    staleTime: 30 * 1000, 
    gcTime: 60 * 1000,  
  },
};
