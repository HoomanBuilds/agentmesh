"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys, cacheConfig } from "@/lib/queryKeys";
import type { Agent } from "@/types";

interface AgentsResponse {
  data: Agent[];
  total: number;
  limit: number;
  offset: number;
}

async function fetchAgents(owner?: string): Promise<Agent[]> {
  const url = owner ? `/api/agents?owner=${owner}` : "/api/agents";
  const res = await fetch(url);
  const { data, error } = await res.json();
  if (error) throw new Error(error);
  return data || [];
}

async function fetchAgent(id: string): Promise<Agent> {
  const res = await fetch(`/api/agents/${id}`);
  const { data, error } = await res.json();
  if (error) throw new Error(error);
  return data;
}

/**
 * Hook to fetch all agents with caching (5 min stale time)
 */
export function useAgents(owner?: string) {
  const queryClient = useQueryClient();

  const { data: agents = [], isLoading: loading, error, refetch } = useQuery({
    queryKey: owner 
      ? queryKeys.agents.byOwner(owner) 
      : queryKeys.agents.all,
    queryFn: () => fetchAgents(owner),
    staleTime: cacheConfig.agents.staleTime,
    gcTime: cacheConfig.agents.gcTime,
    refetchOnWindowFocus: false,
  });

  return { 
    agents, 
    loading, 
    error: error?.message || null, 
    refetch,
    // Helper to invalidate cache after mutation
    invalidate: () => queryClient.invalidateQueries({ queryKey: queryKeys.agents.all }),
  };
}

/**
 * Hook to fetch a single agent with caching (5 min stale time)
 */
export function useAgent(id: string) {
  const queryClient = useQueryClient();

  const { data: agent = null, isLoading: loading, error, refetch } = useQuery({
    queryKey: queryKeys.agents.detail(id),
    queryFn: () => fetchAgent(id),
    staleTime: cacheConfig.agents.staleTime,
    gcTime: cacheConfig.agents.gcTime,
    refetchOnWindowFocus: false,
    enabled: !!id,
  });

  return { 
    agent, 
    loading, 
    error: error?.message || null, 
    refetch,
    // Update cache optimistically
    setAgent: (newAgent: Agent) => {
      queryClient.setQueryData(queryKeys.agents.detail(id), newAgent);
    },
  };
}
