"use client";

import { useState } from "react";
import { Wallet, Copy, ArrowUpRight, RefreshCw, CheckCircle } from "lucide-react";
import { useAgentWallet, useAgentWithdraw } from "@/hooks/useAgentWallet";
import WithdrawModal from "./WithdrawModal";

interface AgentWalletProps {
  agentId: number;
  isOwner: boolean;
  ownerAddress?: string;
}

export default function AgentWallet({ agentId, isOwner, ownerAddress }: AgentWalletProps) {
  const { wallet, isLoading, refetch } = useAgentWallet(agentId);
  const { withdrawMnee, withdrawEth, isWithdrawing, error: withdrawError, txHash } = useAgentWithdraw();
  const [copied, setCopied] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const handleCopy = () => {
    if (wallet?.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWithdrawMnee = async (amount?: string) => {
    if (!ownerAddress) return false;
    const success = await withdrawMnee(agentId, ownerAddress, amount);
    if (success) refetch();
    return success;
  };

  const handleWithdrawEth = async (amount?: string) => {
    if (!ownerAddress) return false;
    const success = await withdrawEth(agentId, ownerAddress, amount);
    if (success) refetch();
    return success;
  };

  if (isLoading && !wallet) {
    return <div className="card p-6 animate-pulse h-32" />;
  }

  if (!wallet) {
    return null;
  }

  const hasAnyBalance = parseFloat(wallet.mneeBalance) > 0 || parseFloat(wallet.ethBalance) > 0.0001;

  return (
    <>
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Agent Wallet
          </h3>
          <button 
            onClick={() => refetch()}
            className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* MNEE Balance */}
          <div className="flex items-end justify-between">
            <div>
              <div className="text-sm text-[var(--text-muted)] mb-1">MNEE Balance</div>
              <div className="text-2xl font-bold">
                {parseFloat(wallet.mneeBalance).toFixed(4)} MNEE
              </div>
            </div>
          </div>
          
          {/* ETH Balance */}
          <div className="flex items-end justify-between pt-3 border-t border-[var(--border-primary)]">
            <div>
              <div className="text-sm text-[var(--text-muted)] mb-1">ETH Balance (for gas)</div>
              <div className="text-xl font-bold">
                {parseFloat(wallet.ethBalance).toFixed(6)} ETH
              </div>
            </div>
          </div>

          {/* Withdraw Button */}
          {isOwner && hasAnyBalance && (
            <button
              onClick={() => setShowWithdrawModal(true)}
              className="w-full px-4 py-3 bg-white text-black rounded-xl font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowUpRight className="w-4 h-4" />
              Withdraw Funds
            </button>
          )}

          {/* Address */}
          <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg flex items-center justify-between">
            <code className="text-sm text-[var(--text-secondary)] font-mono truncate mr-4">
              {wallet.address}
            </code>
            <button
              onClick={handleCopy}
              className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex-shrink-0"
              title="Copy Address"
            >
              {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Transaction hash if just withdrew */}
          {txHash && (
            <div className="text-sm text-green-400">
              Withdrawal successful! Tx: {txHash.slice(0, 10)}...
            </div>
          )}

          {/* Error */}
          {withdrawError && (
            <div className="text-sm text-red-400">
              {withdrawError}
            </div>
          )}

          <div className="text-xs text-[var(--text-muted)]">
            Fund this wallet to let the agent pay other agents.
          </div>
        </div>
      </div>

      {/* Withdraw Modal */}
      <WithdrawModal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        mneeBalance={wallet.mneeBalance}
        ethBalance={wallet.ethBalance}
        onWithdrawMnee={handleWithdrawMnee}
        onWithdrawEth={handleWithdrawEth}
        isWithdrawing={isWithdrawing}
      />
    </>
  );
}
