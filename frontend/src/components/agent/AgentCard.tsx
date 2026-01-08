"use client";

import Link from "next/link";
import { Bot, ArrowRight } from "lucide-react";
import { formatEther } from "viem";
import type { Agent } from "@/types";

interface AgentCardProps {
  agent: Agent;
  href?: string;
}

export default function AgentCard({ agent, href }: AgentCardProps) {
  const content = (
    <div className="group h-full p-6 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-primary)] hover:border-[var(--border-secondary)] transition-all duration-200 hover:-translate-y-1 cursor-pointer">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-200 overflow-hidden border border-[var(--border-primary)]">
          {agent.image_url ? (
            <img 
              src={agent.image_url} 
              alt={agent.name} 
              className="w-full h-full object-cover"
            />
          ) : (
            <Bot className="w-6 h-6 text-[var(--text-secondary)]" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Name and ID */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold truncate group-hover:text-[var(--text-primary)] transition-colors">
              {agent.name}
            </h3>
            {agent.onchain_id !== null && (
              <span className="px-1.5 py-0.5 text-xs bg-[var(--bg-surface)] rounded text-[var(--text-muted)]">
                #{agent.onchain_id}
              </span>
            )}
          </div>
          
          {/* Description */}
          <p className="text-[var(--text-secondary)] text-sm line-clamp-2 mb-4 leading-relaxed">
            {agent.description || "No description"}
          </p>
          
          {/* Footer */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {formatEther(BigInt(agent.price_per_call))} MNEE
            </span>
            <div className="flex items-center gap-2">
              {agent.active ? (
                <span className="text-xs text-[var(--success)] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                  Active
                </span>
              ) : (
                <span className="text-xs text-[var(--text-muted)]">Inactive</span>
              )}
              <ArrowRight className="w-4 h-4 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="block h-full">{content}</Link>;
  }

  return content;
}
