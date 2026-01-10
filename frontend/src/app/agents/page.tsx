"use client";

import Layout from "@/components/Layout";
import { Search } from "lucide-react";
import { useState } from "react";
import { useAgents } from "@/hooks/useAgents";
import { AgentCard } from "@/components/agent";
import { SectionLoader, EmptyState, PageHeader } from "@/components/ui";
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/animations";

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
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
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
                  className="input pl-10 w-full sm:w-72"
                />
              </div>
            </PageHeader>
          </motion.div>

          {loading ? (
            <SectionLoader />
          ) : filteredAgents.length > 0 ? (
            <motion.div
              initial="initial"
              animate="animate"
              variants={staggerContainer}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {filteredAgents.map((agent) => (
                <motion.div key={agent.id} variants={fadeInUp} transition={{ duration: 0.4 }}>
                  <AgentCard
                    agent={agent}
                    href={`/agents/${agent.id}`}
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <EmptyState
                title="No agents found"
                description={search ? "Try a different search term" : "Be the first to create an agent"}
                action={{ label: "Create Agent", href: "/create" }}
              />
            </motion.div>
          )}
        </div>
      </div>
    </Layout>
  );
}
