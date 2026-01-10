"use client";

import { Bot } from "lucide-react";
import { formatEther } from "viem";
import type { Agent } from "@/types";

interface AgentCardMiniProps {
  agent: Agent;
}

export default function AgentCardMini({ agent }: AgentCardMiniProps) {
  return (
    <div className="flex items-center gap-4 p-4 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-primary)] min-w-[280px] max-w-[320px] hover:border-[var(--border-secondary)] transition-all">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center flex-shrink-0 overflow-hidden border border-[var(--border-primary)]">
        {agent.image_url ? (
          <img
            src={agent.image_url}
            alt={agent.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Bot className="w-5 h-5 text-[var(--text-secondary)]" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h4 className="font-semibold text-sm truncate">{agent.name}</h4>
          {agent.active && (
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] flex-shrink-0" />
          )}
        </div>
        <p className="text-xs text-[var(--text-muted)] truncate">
          {formatEther(BigInt(agent.price_per_call))} MNEE / call
        </p>
      </div>
    </div>
  );
}
