"use client";

import { Bot, Wallet, DollarSign, User, Trash2, Loader2 } from "lucide-react";
import { formatEther } from "viem";

interface Agent {
  id: string;
  name: string;
  description?: string;
  image_url?: string | null;
  onchain_id: number | null;
  price_per_call: string;
  owner_address?: string;
}

interface AgentInfoPanelProps {
  agent: Agent;
  walletAddress?: string;
  walletBalance?: string;
  onClearSession?: () => void;
  isClearing?: boolean;
}

export default function AgentInfoPanel({
  agent,
  walletAddress,
  walletBalance,
  onClearSession,
  isClearing,
}: AgentInfoPanelProps) {
  return (
    <div className="w-80 border-r border-[var(--border-primary)] bg-[var(--bg-secondary)] flex flex-col h-full">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Agent Image */}
        <div className="w-full aspect-square rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] flex items-center justify-center overflow-hidden">
          {agent.image_url ? (
            <img
              src={agent.image_url}
              alt={agent.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Bot className="w-20 h-20 text-[var(--text-muted)]" />
          )}
        </div>

        {/* Agent Info */}
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-[var(--text-primary)]">
            {agent.name}
          </h3>
          {agent.onchain_id !== null && (
            <p className="text-sm text-[var(--text-muted)]">
              Agent #{agent.onchain_id}
            </p>
          )}
          {agent.description && (
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {agent.description}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-primary)]">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-muted)]">Price</span>
            </div>
            <div className="text-lg font-bold text-[var(--text-primary)]">
              {formatEther(BigInt(agent.price_per_call))}
            </div>
            <div className="text-xs text-[var(--text-muted)]">MNEE</div>
          </div>
          
          {walletBalance !== undefined && (
            <div className="p-4 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-primary)]">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-xs text-[var(--text-muted)]">Balance</span>
              </div>
              <div className="text-lg font-bold text-[var(--text-primary)]">
                {parseFloat(walletBalance).toFixed(4)}
              </div>
              <div className="text-xs text-[var(--text-muted)]">MNEE</div>
            </div>
          )}
        </div>

        {/* Owner */}
        {agent.owner_address && (
          <div className="p-4 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-primary)]">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-muted)]">Owner</span>
            </div>
            <div className="text-sm font-mono text-[var(--text-secondary)] truncate">
              {agent.owner_address.slice(0, 6)}...{agent.owner_address.slice(-4)}
            </div>
          </div>
        )}

        {/* Wallet Address */}
        {walletAddress && (
          <div className="p-4 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-primary)]">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-muted)]">Agent Wallet</span>
            </div>
            <div className="text-sm font-mono text-[var(--text-secondary)] truncate">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </div>
          </div>
        )}
      </div>

      {/* Clear Session Button */}
      {onClearSession && (
        <div className="p-6 border-t border-[var(--border-primary)]">
          <button
            onClick={onClearSession}
            disabled={isClearing}
            className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--error)]/30 text-[var(--error)] rounded-xl hover:bg-[var(--error)]/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isClearing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Clear Session
          </button>
        </div>
      )}
    </div>
  );
}
