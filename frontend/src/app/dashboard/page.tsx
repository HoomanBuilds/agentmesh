"use client";

import Layout from "@/components/Layout";
import { Link } from "next-view-transitions";
import { Plus, TrendingUp, Users, Zap, DollarSign } from "lucide-react";
import { useAccount } from "wagmi";
import { useAgents } from "@/hooks/useAgents";
import { AgentCard } from "@/components/agent";
import { SectionLoader, EmptyState, PageHeader } from "@/components/ui";
import { motion } from "framer-motion";

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { agents, loading } = useAgents(address);

  const totalAgents = agents.length;
  const activeAgents = agents.filter((a) => a.active).length;

  if (!isConnected) {
    return (
      <Layout>
        <div className="py-12">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <EmptyState
                title="Connect Your Wallet"
                description="Connect your wallet to view your agents"
                action={{ label: "Go Home", href: "/" }}
              />
            </motion.div>
          </div>
        </div>
      </Layout>
    );
  }

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
              title="My Agents"
              description="Manage your AI agents"
            >
              <Link href="/create" className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create Agent
              </Link>
            </PageHeader>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8"
          >
            <motion.div variants={fadeInUp} transition={{ duration: 0.4 }} className="p-5 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-primary)]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center">
                  <Users className="w-4 h-4 text-[var(--text-secondary)]" />
                </div>
              </div>
              <div className="text-2xl font-bold mb-1">{totalAgents}</div>
              <div className="text-sm text-[var(--text-muted)]">Total Agents</div>
            </motion.div>
            <motion.div variants={fadeInUp} transition={{ duration: 0.4 }} className="p-5 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-primary)]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center">
                  <Zap className="w-4 h-4 text-[var(--text-secondary)]" />
                </div>
              </div>
              <div className="text-2xl font-bold mb-1">{activeAgents}</div>
              <div className="text-sm text-[var(--text-muted)]">Active</div>
            </motion.div>
            <motion.div variants={fadeInUp} transition={{ duration: 0.4 }} className="p-5 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-primary)]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-[var(--text-secondary)]" />
                </div>
              </div>
              <div className="text-2xl font-bold mb-1">0</div>
              <div className="text-sm text-[var(--text-muted)]">Total Calls</div>
            </motion.div>
            <motion.div variants={fadeInUp} transition={{ duration: 0.4 }} className="p-5 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-primary)]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-[var(--text-secondary)]" />
                </div>
              </div>
              <div className="text-2xl font-bold mb-1">0.00</div>
              <div className="text-sm text-[var(--text-muted)]">Earned (MNEE)</div>
            </motion.div>
          </motion.div>

          {/* Agents List */}
          {loading ? (
            <SectionLoader />
          ) : agents.length > 0 ? (
            <motion.div
              initial="initial"
              animate="animate"
              variants={staggerContainer}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {agents.map((agent) => (
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
                title="No agents yet"
                description="Create your first agent to start earning"
                action={{ label: "Create Agent", href: "/create" }}
              />
            </motion.div>
          )}
        </div>
      </div>
    </Layout>
  );
}
