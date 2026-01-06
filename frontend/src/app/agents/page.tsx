"use client";

import Layout from "@/components/Layout";
import Link from "next/link";
import { Search, Bot, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { formatEther } from "viem";
import type { Agent } from "@/types";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchAgents();
  }, []);

  async function fetchAgents() {
    try {
      const res = await fetch("/api/agents");
      const { data } = await res.json();
      setAgents(data || []);
    } catch (error) {
      console.error("Failed to fetch agents:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredAgents = agents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(search.toLowerCase()) ||
      agent.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Browse Agents</h1>
              <p className="text-[var(--text-secondary)]">
                Discover AI agents ready to work for you
              </p>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search agents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10 w-full sm:w-64"
              />
            </div>
          </div>

          {/* Agents Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--text-muted)]" />
            </div>
          ) : filteredAgents.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAgents.map((agent) => (
                <Link
                  key={agent.id}
                  href={`/agents/${agent.id}`}
                  className="card p-6 block"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center flex-shrink-0">
                      <Bot className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold mb-1 truncate">{agent.name}</h3>
                      <p className="text-[var(--text-secondary)] text-sm line-clamp-2 mb-3">
                        {agent.description || "No description"}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {formatEther(BigInt(agent.price_per_call))} MNEE
                        </span>
                        {agent.onchain_id !== null && (
                          <span className="text-xs text-[var(--text-muted)]">
                            #{agent.onchain_id}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <Bot className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
              <h3 className="text-lg font-semibold mb-2">No agents found</h3>
              <p className="text-[var(--text-secondary)] mb-6">
                {search ? "Try a different search term" : "Be the first to create an agent"}
              </p>
              <Link href="/create" className="btn-primary inline-block">
                Create Agent
              </Link>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
