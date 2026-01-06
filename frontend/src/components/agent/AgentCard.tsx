"use client";

import Link from "next/link";
import { Bot } from "lucide-react";
import { formatEther } from "viem";
import type { Agent } from "@/types";

interface AgentCardProps {
  agent: Agent;
  href?: string;
}

export default function AgentCard({ agent, href }: AgentCardProps) {
  const content = (
    <div className="card p-6 block hover:border-[var(--border-hover)] transition-colors">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center flex-shrink-0">
          <Bot className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold truncate">{agent.name}</h3>
            {agent.onchain_id !== null && (
              <span className="px-1.5 py-0.5 text-xs bg-[var(--bg-tertiary)] rounded">
                #{agent.onchain_id}
              </span>
            )}
          </div>
          <p className="text-[var(--text-secondary)] text-sm line-clamp-2 mb-3">
            {agent.description || "No description"}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {formatEther(BigInt(agent.price_per_call))} MNEE
            </span>
            {agent.active ? (
              <span className="text-xs text-green-400">Active</span>
            ) : (
              <span className="text-xs text-[var(--text-muted)]">Inactive</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
