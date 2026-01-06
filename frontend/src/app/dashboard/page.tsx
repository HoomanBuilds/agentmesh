"use client";

import Layout from "@/components/Layout";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useAccount } from "wagmi";
import { useAgents } from "@/hooks/useAgents";
import { AgentCard } from "@/components/agent";
import { SectionLoader, EmptyState, PageHeader } from "@/components/ui";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { agents, loading } = useAgents(address);

  const totalAgents = agents.length;
  const activeAgents = agents.filter((a) => a.active).length;

  if (!isConnected) {
    return (
      <Layout>
        <div className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <EmptyState
              title="Connect Your Wallet"
              description="Connect your wallet to view your agents"
              action={{ label: "Go Home", href: "/" }}
            />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <PageHeader
            title="My Agents"
            description="Manage your AI agents"
          >
            <Link href="/create" className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Agent
            </Link>
          </PageHeader>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="card p-4">
              <div className="text-2xl font-bold">{totalAgents}</div>
              <div className="text-sm text-[var(--text-secondary)]">Total Agents</div>
            </div>
            <div className="card p-4">
              <div className="text-2xl font-bold">{activeAgents}</div>
              <div className="text-sm text-[var(--text-secondary)]">Active</div>
            </div>
            <div className="card p-4">
              <div className="text-2xl font-bold">0</div>
              <div className="text-sm text-[var(--text-secondary)]">Total Calls</div>
            </div>
            <div className="card p-4">
              <div className="text-2xl font-bold">0.00</div>
              <div className="text-sm text-[var(--text-secondary)]">Earned (MNEE)</div>
            </div>
          </div>

          {/* Agents List */}
          {loading ? (
            <SectionLoader />
          ) : agents.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  href={`/agents/${agent.id}`}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No agents yet"
              description="Create your first agent to start earning"
              action={{ label: "Create Agent", href: "/create" }}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}
