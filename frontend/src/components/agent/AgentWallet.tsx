"use client";

import { useState, useRef, useEffect } from "react";
import { Wallet, Copy, ArrowUpRight, RefreshCw, CheckCircle } from "lucide-react";
import { useAgentWallet, useAgentWithdraw } from "@/hooks/useAgentWallet";
import { LoadingSpinner } from "@/components/ui";

interface AgentWalletProps {
  agentId: number;
  isOwner: boolean;
  ownerAddress?: string;
}

export default function AgentWallet({ agentId, isOwner, ownerAddress }: AgentWalletProps) {
  const { wallet, isLoading, refetch } = useAgentWallet(agentId);
  const { withdraw, isWithdrawing, error: withdrawError, txHash } = useAgentWithdraw();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (wallet?.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWithdraw = async () => {
    if (!ownerAddress) {
      alert("Owner address not available");
      return;
    }
    if (!confirm("Withdraw all MNEE to your wallet?")) return;
    
    const success = await withdraw(agentId, ownerAddress);
    if (success) {
      refetch();
    }
  };

  if (isLoading && !wallet) {
    return <div className="card p-6 animate-pulse h-32" />;
  }

  if (!wallet) {
    return null;
  }

  const hasBalance = parseFloat(wallet.mneeBalance) > 0;

  return (
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
        {/* Balance */}
        <div className="flex items-end justify-between">
          <div>
            <div className="text-sm text-[var(--text-muted)] mb-1">MNEE Balance</div>
            <div className="text-2xl font-bold">
              {parseFloat(wallet.mneeBalance).toFixed(4)} MNEE
            </div>
          </div>
          {isOwner && hasBalance && (
            <button
              onClick={handleWithdraw}
              disabled={isWithdrawing}
              className="btn-secondary text-sm flex items-center gap-2"
            >
              {isWithdrawing ? (
                <LoadingSpinner size="sm" />
              ) : (
                <ArrowUpRight className="w-4 h-4" />
              )}
              Withdraw
            </button>
          )}
        </div>

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
  );
}
