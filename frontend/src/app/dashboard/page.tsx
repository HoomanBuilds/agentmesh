"use client";

import Layout from "@/components/Layout";
import { Link } from "next-view-transitions";
import { Plus, TrendingUp, Users, Zap, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useAccount } from "wagmi";
import { useAgents, useOwnerTransactions } from "@/hooks";
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
  const { transactions, stats, loading: txLoading } = useOwnerTransactions(address);

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

          {/* Transaction History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-12"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Transaction History</h2>
              <div className="flex gap-4 text-sm">
                <div className="text-[var(--text-muted)]">
                  Total Earned: <span className="text-green-500 font-medium">+{stats.totalEarned} MNEE</span>
                </div>
                <div className="text-[var(--text-muted)]">
                  Total Spent: <span className="text-orange-500 font-medium">-{stats.totalSpent} MNEE</span>
                </div>
              </div>
            </div>

            <div className="card overflow-hidden">
              {txLoading ? (
                <div className="text-center py-8 text-[var(--text-muted)]">
                  Loading transactions...
                </div>
              ) : transactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]">
                        <th className="text-left py-3 px-4 text-xs font-medium text-[var(--text-muted)] uppercase">Type</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-[var(--text-muted)] uppercase">Agent</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-[var(--text-muted)] uppercase">Counterparty</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-[var(--text-muted)] uppercase">Date & Time</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-[var(--text-muted)] uppercase">Tx Hash</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-[var(--text-muted)] uppercase">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-primary)]">
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                tx.type === "earned" 
                                  ? "bg-green-500/10 text-green-500" 
                                  : "bg-orange-500/10 text-orange-500"
                              }`}>
                                {tx.type === "earned" ? (
                                  <ArrowDownRight className="w-4 h-4" />
                                ) : (
                                  <ArrowUpRight className="w-4 h-4" />
                                )}
                              </div>
                              <span className="text-sm font-medium capitalize">{tx.type}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-sm font-medium">{tx.ownedAgent.name}</td>
                          <td className="py-4 px-4 text-sm text-[var(--text-secondary)]">{tx.counterparty.name}</td>
                          <td className="py-4 px-4 text-sm text-[var(--text-secondary)]">
                            {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-4 px-4">
                            {tx.txHash ? (
                              <a 
                                href={`https://sepolia.etherscan.io/tx/${tx.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-[var(--accent-primary)] hover:underline font-mono"
                              >
                                {tx.txHash.slice(0, 8)}...{tx.txHash.slice(-6)}
                              </a>
                            ) : (
                              <span className="text-sm text-[var(--text-muted)]">—</span>
                            )}
                          </td>
                          <td className={`py-4 px-4 text-right font-semibold ${
                            tx.type === "earned" ? "text-green-500" : "text-orange-500"
                          }`}>
                            {tx.type === "earned" ? "+" : "-"}{tx.amount} MNEE
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-[var(--text-muted)]">
                  No transactions yet. Start chatting with your agents to see activity here.
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
