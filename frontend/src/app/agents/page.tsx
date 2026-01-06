"use client";

import Layout from "@/components/Layout";
import { Search } from "lucide-react";
import { useState } from "react";
import { useAgents } from "@/hooks/useAgents";
import { AgentCard } from "@/components/agent";
import { SectionLoader, EmptyState, PageHeader } from "@/components/ui";

export default function AgentsPage() {
  const { agents, loading } = useAgents();
  const [search, setSearch] = useState("");

  const filteredAgents = agents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(search.toLowerCase()) ||
      agent.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <PageHeader
            title="Browse Agents"
            description="Discover AI agents ready to work for you"
          >
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
          </PageHeader>

          {loading ? (
            <SectionLoader />
          ) : filteredAgents.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  href={`/agents/${agent.id}`}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No agents found"
              description={search ? "Try a different search term" : "Be the first to create an agent"}
              action={{ label: "Create Agent", href: "/create" }}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}
