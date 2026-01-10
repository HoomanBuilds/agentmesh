"use client";

import Layout from "@/components/Layout";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { 
  Bot, Copy, CheckCircle, Edit, MessageSquare, ChevronDown, ChevronUp,
  User, Calendar, DollarSign, Zap, ArrowDownRight, ArrowUpRight
} from "lucide-react";
import { Link } from "next-view-transitions";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { useAgent, useAgentWallet, useAgentTransactions } from "@/hooks";
import { PageLoader, EmptyState } from "@/components/ui";
import { AgentWallet, AgentImage, EditAgentModal } from "@/components/agent";
import { motion, AnimatePresence } from "framer-motion";
import { getTxExplorerUrl } from "@/lib/contracts";

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;
  const { isConnected, address } = useAccount();
  const { agent, loading } = useAgent(agentId);
  const { wallet } = useAgentWallet(agent?.onchain_id ?? null);
  const { transactions, stats, loading: transactionsLoading } = useAgentTransactions(agentId);

  const isOwner = address && agent ? address.toLowerCase() === agent.owner_address?.toLowerCase() : false;

  const [copied, setCopied] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isTransactionsOpen, setIsTransactionsOpen] = useState(false);

  function copyToClipboard() {
    if (agent) {
      navigator.clipboard.writeText(agent.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (loading) {
    return (
      <Layout>
        <PageLoader />
      </Layout>
    );
  }

  if (!agent) {
    return (
      <Layout>
        <div className="py-12">
          <div className="max-w-xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <EmptyState
                title="Agent not found"
                description="This agent doesn't exist or has been removed"
                action={{ label: "Browse Agents", href: "/agents" }}
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-7xl mx-auto px-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Left Column - Image & Actions */}
            <div className="lg:col-span-2">
              {/* Agent Image */}
              <div className="card p-6 mb-6">
                <div className="aspect-square w-full rounded-xl overflow-hidden bg-[var(--bg-tertiary)] flex items-center justify-center mb-6">
                  {agent.image_url ? (
                    <img 
                      src={agent.image_url} 
                      alt={agent.name} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <Bot className="w-24 h-24 text-[var(--text-muted)]" />
                  )}
                </div>

                {/* Chat Button */}
                {isOwner && (
                  <Link
                    href={`/chat/${agent.id}`}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-4"
                  >
                    <MessageSquare className="w-5 h-5" />
                    Chat with {agent.name}
                  </Link>
                )}
              </div>

              {/* Quick Stats */}
              <div className="card p-6">
                <h3 className="text-sm font-medium text-[var(--text-muted)] mb-4 uppercase tracking-wider">
                  Statistics
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Total Jobs</span>
                    <span className="font-semibold">{stats.totalJobs}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Total Earned</span>
                    <span className="font-semibold text-green-500">{stats.totalEarned} MNEE</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Total Spent</span>
                    <span className="font-semibold text-orange-500">{stats.totalSpent} MNEE</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Details */}
            <div className="lg:col-span-3">
              {/* Header Card */}
              <div className="card p-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h1 className="text-3xl font-bold">{agent.name}</h1>
                      {agent.onchain_id !== null && (
                        <span className="px-2 py-0.5 text-xs bg-[var(--bg-tertiary)] rounded">
                          #{agent.onchain_id}
                        </span>
                      )}
                    </div>
                    <p className="text-[var(--text-secondary)]">
                      {agent.description || "No description provided"}
                    </p>
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="btn-secondary text-sm flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[var(--accent-primary)]" />
                    <span className="font-semibold">
                      {formatEther(BigInt(agent.price_per_call))} MNEE / call
                    </span>
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied" : "Copy ID"}
                  </button>
                </div>
              </div>

              {/* Details Card */}
              <div className="card p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">Details</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center">
                      <User className="w-5 h-5 text-[var(--text-secondary)]" />
                    </div>
                    <div>
                      <div className="text-xs text-[var(--text-muted)]">Owner</div>
                      <div className="font-mono text-sm">
                        {agent.owner_address?.slice(0, 6)}...{agent.owner_address?.slice(-4)}
                        {isOwner && (
                          <span className="ml-2 px-2 py-0.5 bg-[var(--bg-tertiary)] text-[var(--accent-primary)] text-xs rounded">
                            You
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-[var(--text-secondary)]" />
                    </div>
                    <div>
                      <div className="text-xs text-[var(--text-muted)]">Created</div>
                      <div className="text-sm">
                        {new Date(agent.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center">
                      <Zap className="w-5 h-5 text-[var(--text-secondary)]" />
                    </div>
                    <div>
                      <div className="text-xs text-[var(--text-muted)]">Status</div>
                      <div className="text-sm flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${agent.active ? 'bg-green-500' : 'bg-gray-500'}`} />
                        {agent.active ? "Active" : "Inactive"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Agent Wallet - end of right column */}
              {agent.onchain_id !== null && (
                <div className="mb-6">
                  <AgentWallet agentId={agent.onchain_id} isOwner={isOwner} ownerAddress={address} />
                </div>
              )}
            </div>
          </div>

          {/* Transaction History - Full Width Below Grid */}
          <div className="mt-8">
            <div className="card overflow-hidden">
              <button
                onClick={() => setIsTransactionsOpen(!isTransactionsOpen)}
                className="w-full p-6 flex items-center justify-between hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <h3 className="text-lg font-semibold">Transaction History</h3>
                {isTransactionsOpen ? (
                  <ChevronUp className="w-5 h-5 text-[var(--text-muted)]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[var(--text-muted)]" />
                )}
              </button>

              <AnimatePresence>
                {isTransactionsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 space-y-3">
                      {transactionsLoading ? (
                        <div className="text-center py-8 text-[var(--text-muted)]">
                          Loading transactions...
                        </div>
                      ) : transactions.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-[var(--border-primary)]">
                                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--text-muted)] uppercase">Type</th>
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
                                  <td className="py-4 px-4 text-sm">{tx.counterparty.name}</td>
                                  <td className="py-4 px-4 text-sm text-[var(--text-secondary)]">
                                    {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </td>
                                  <td className="py-4 px-4">
                                    {tx.txHash ? (
                                      <a 
                                        href={getTxExplorerUrl(tx.txHash)}
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
                          No transactions yet
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Edit Modal */}
      {agent && (
        <EditAgentModal
          agent={agent}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={() => {
            window.location.reload();
          }}
        />
      )}
    </Layout>
  );
}
