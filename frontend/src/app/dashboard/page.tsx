"use client";

import Layout from "@/components/Layout";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useEffect, useState } from "react";
import { Bot, Loader2, Plus, TrendingUp } from "lucide-react";
import { formatEther } from "viem";
import type { Agent } from "@/types";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (address) {
      fetchMyAgents();
    } else {
      setLoading(false);
    }
  }, [address]);

  async function fetchMyAgents() {
    try {
      const res = await fetch(`/api/agents?owner=${address}`);
      const { data } = await res.json();
      setAgents(data || []);
    } catch (error) {
      console.error("Failed to fetch agents:", error);
    } finally {
      setLoading(false);
    }
  }

  const totalAgents = agents.length;
  const activeAgents = agents.filter((a) => a.active).length;

  if (!isConnected) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Bot className="w-12 h-12 mb-4 text-[var(--text-muted)]" />
          <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
          <p className="text-[var(--text-secondary)]">
            View and manage your agents
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
              <p className="text-[var(--text-secondary)]">
                Manage your AI agents
              </p>
            </div>
            <Link href="/create" className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Agent
            </Link>
          </div>

          {/* Stats */}
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            <div className="card p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{totalAgents}</div>
                  <div className="text-sm text-[var(--text-muted)]">Total Agents</div>
                </div>
              </div>
            </div>
            <div className="card p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{activeAgents}</div>
                  <div className="text-sm text-[var(--text-muted)]">Active</div>
                </div>
              </div>
            </div>
            <div className="card p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center">
                  <span className="font-bold">M</span>
                </div>
                <div>
                  <div className="text-2xl font-bold">0</div>
                  <div className="text-sm text-[var(--text-muted)]">MNEE Earned</div>
                </div>
              </div>
            </div>
          </div>

          {/* Agents List */}
          <div className="card">
            <div className="p-4 border-b border-[var(--border-default)]">
              <h2 className="font-semibold">My Agents</h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : agents.length > 0 ? (
              <div className="divide-y divide-[var(--border-default)]">
                {agents.map((agent) => (
                  <Link
                    key={agent.id}
                    href={`/agents/${agent.id}`}
                    className="flex items-center justify-between p-4 hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center">
                        <Bot className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium">{agent.name}</div>
                        <div className="text-sm text-[var(--text-muted)]">
                          {formatEther(BigInt(agent.price_per_call))} MNEE/call
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {agent.onchain_id !== null && (
                        <span className="text-xs text-[var(--text-muted)]">
                          #{agent.onchain_id}
                        </span>
                      )}
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          agent.active
                            ? "bg-green-500/10 text-green-400"
                            : "bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
                        }`}
                      >
                        {agent.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <Bot className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" />
                <p className="text-[var(--text-secondary)] mb-4">
                  You haven't created any agents yet
                </p>
                <Link href="/create" className="btn-secondary inline-block">
                  Create Your First Agent
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
