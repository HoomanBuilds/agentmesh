"use client";

import { useState, useEffect, useCallback } from "react";
import type { Agent } from "@/types";

export function useAgents(owner?: string) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      const url = owner ? `/api/agents?owner=${owner}` : "/api/agents";
      const res = await fetch(url);
      const { data, error: apiError } = await res.json();
      
      if (apiError) {
        setError(apiError);
      } else {
        setAgents(data || []);
      }
    } catch (err) {
      setError("Failed to fetch agents");
      console.error("Failed to fetch agents:", err);
    } finally {
      setLoading(false);
    }
  }, [owner]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return { agents, loading, error, refetch: fetchAgents };
}

export function useAgent(id: string) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgent = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/agents/${id}`);
      const { data, error: apiError } = await res.json();
      
      if (apiError) {
        setError(apiError);
      } else {
        setAgent(data);
      }
    } catch (err) {
      setError("Failed to fetch agent");
      console.error("Failed to fetch agent:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

  return { agent, loading, error, refetch: fetchAgent };
}
