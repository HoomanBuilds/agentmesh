"use client";

import { Bot, Loader2 } from "lucide-react";
import { Link } from "next-view-transitions";

interface Agent {
  id: string;
  name: string;
  image_url?: string | null;
  onchain_id: number | null;
}

interface AgentIconBarProps {
  agents: Agent[];
  isLoading: boolean;
  selectedAgentId: string | null;
  onSelectAgent?: (agentId: string) => void;
}

export default function AgentIconBar({
  agents,
  isLoading,
  selectedAgentId,
  onSelectAgent,
}: AgentIconBarProps) {
  if (isLoading) {
    return (
      <div className="w-20 border-r border-[var(--border-primary)] bg-[var(--bg-secondary)] flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-[var(--text-muted)] animate-spin" />
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="w-20 border-r border-[var(--border-primary)] bg-[var(--bg-secondary)] flex flex-col items-center justify-center py-8">
        <Bot className="w-8 h-8 text-[var(--text-muted)] mb-2" />
        <p className="text-[10px] text-[var(--text-muted)] text-center px-2">No agents</p>
      </div>
    );
  }

  return (
    <div className="w-20 border-r border-[var(--border-primary)] bg-[var(--bg-secondary)] flex flex-col items-center py-4 gap-3 overflow-y-auto">
      <div className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider mb-1">
        Agents
      </div>
      
      {agents.map((agent) => (
        <Link
          key={agent.id}
          href={`/chat/${agent.id}`}
          onClick={() => onSelectAgent?.(agent.id)}
          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
            selectedAgentId === agent.id
              ? "ring-2 ring-[var(--text-primary)] ring-offset-2 ring-offset-[var(--bg-secondary)]"
              : "opacity-60 hover:opacity-100"
          }`}
          title={agent.name}
        >
          {agent.image_url ? (
            <img
              src={agent.image_url}
              alt={agent.name}
              className="w-full h-full rounded-xl object-cover"
            />
          ) : (
            <div className="w-full h-full rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] flex items-center justify-center">
              <Bot className="w-5 h-5 text-[var(--text-secondary)]" />
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
