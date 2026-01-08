"use client";

import { Bot, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ChatHeaderProps {
  agentName: string;
  agentDescription?: string;
  agentId: string;
  imageUrl?: string;
}

export default function ChatHeader({
  agentName,
  agentDescription,
  agentId,
  imageUrl,
}: ChatHeaderProps) {
  return (
    <div className="border-b border-[var(--border-primary)] p-4 bg-[var(--bg-secondary)] flex items-center gap-4">
      {/* Back button */}
      <Link
        href={`/agents/${agentId}`}
        className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
      >
        <ArrowLeft className="w-5 h-5 text-[var(--text-muted)]" />
      </Link>

      {/* Avatar */}
      <div className="relative">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={agentName}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[var(--accent-primary)]/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-[var(--accent-primary)]" />
          </div>
        )}
        {/* Online indicator */}
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[var(--bg-secondary)]" />
      </div>

      {/* Agent info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-[var(--text-primary)] truncate">
            {agentName}
          </h2>
          <span className="px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] font-medium text-green-400 uppercase tracking-wider">
            Online
          </span>
        </div>
        {agentDescription && (
          <p className="text-sm text-[var(--text-muted)] truncate">
            {agentDescription}
          </p>
        )}
      </div>
    </div>
  );
}
