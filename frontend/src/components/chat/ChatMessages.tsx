"use client";

import { Message, PendingAgent } from "@/hooks/useChat";
import { Bot, CheckCircle, ArrowRight, Star, Briefcase, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState } from "react";
import RatingStars from "./RatingStars";

interface ChatMessagesProps {
  messages: Message[];
  agentName: string;
  agentImage?: string | null;
  isThinking?: boolean;
  onConfirmRouting?: () => void;
  onCancelRouting?: () => void;
  onSelectAgent?: (agentId: string) => void;
  onAutoForward?: (agentId: string) => void;
  pendingConfirmation?: boolean;
  userAddress?: string;
}

export default function ChatMessages({
  messages,
  agentName,
  agentImage,
  isThinking = false,
  onConfirmRouting,
  onCancelRouting,
  onSelectAgent,
  onAutoForward,
  pendingConfirmation = false,
  userAddress,
}: ChatMessagesProps) {
  const [sortBy, setSortBy] = useState<"jobs" | "rating">("jobs");
  const [ratedJobs, setRatedJobs] = useState<Set<string>>(new Set());
  if (messages.length === 0 && !isThinking) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-4 border border-[var(--border-primary)] overflow-hidden">
            {agentImage ? (
              <img src={agentImage} alt={agentName} className="w-full h-full object-cover" />
            ) : (
              <Bot className="w-8 h-8 text-[var(--text-secondary)]" />
            )}
          </div>
          <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
            Start a conversation
          </h3>
          <p className="text-[var(--text-muted)]">
            Send a message to chat with {agentName}
          </p>
        </div>
      </div>
    );
  }

  // Markdown components for styling
  const markdownComponents = {
    p: ({ children }: any) => <p className="mb-2 last:mb-0">{children}</p>,
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || "");
      return !inline && match ? (
        <div className="rounded-lg overflow-hidden my-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] max-w-full">
          <div className="flex items-center justify-between px-3 py-1 bg-[var(--bg-surface)] border-b border-[var(--border-primary)]">
            <span className="text-xs text-[var(--accent-primary)] font-mono">
              {match[1]}
            </span>
          </div>
          <div className="p-3 overflow-x-auto max-w-full">
            <pre className="m-0"><code className={`${className} text-sm whitespace-pre`} {...props}>
              {children}
            </code></pre>
          </div>
        </div>
      ) : (
        <code
          className="bg-[var(--bg-surface)] px-1.5 py-0.5 rounded text-[var(--accent-primary)] font-mono text-sm"
          {...props}
        >
          {children}
        </code>
      );
    },
    ul: ({ children }: any) => (
      <ul className="list-disc list-outside ml-4 mb-2 space-y-1">
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol className="list-decimal list-outside ml-4 mb-2 space-y-1">
        {children}
      </ol>
    ),
    li: ({ children }: any) => (
      <li className="text-sm pl-1 marker:text-[var(--accent-primary)] [&>p]:m-0">{children}</li>
    ),
    a: ({ href, children }: any) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--accent-primary)] hover:underline"
      >
        {children}
      </a>
    ),
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-2 border-[var(--accent-primary)] pl-3 italic my-2 text-[var(--text-secondary)]">
        {children}
      </blockquote>
    ),
    table: ({ children }: any) => (
      <div className="overflow-x-auto my-4 rounded-lg border border-[var(--border-primary)]">
        <table className="min-w-full divide-y divide-[var(--border-primary)] bg-[var(--bg-surface)]">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }: any) => (
      <thead className="bg-[var(--bg-tertiary)]">
        {children}
      </thead>
    ),
    tbody: ({ children }: any) => (
      <tbody className="divide-y divide-[var(--border-primary)] bg-transparent">
        {children}
      </tbody>
    ),
    tr: ({ children }: any) => (
      <tr className="hover:bg-[var(--bg-tertiary)] transition-colors">
        {children}
      </tr>
    ),
    th: ({ children }: any) => (
      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-primary)] uppercase tracking-wider">
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td className="px-4 py-3 text-sm text-[var(--text-primary)] whitespace-normal">
        {children}
      </td>
    ),
    h1: ({ children }: any) => <h1 className="text-xl font-bold mb-2 mt-4">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-base font-bold mb-2 mt-2">{children}</h3>,
    hr: () => <hr className="my-4 border-[var(--border-primary)]" />,
    strong: ({ children }: any) => <strong className="font-bold">{children}</strong>,
    em: ({ children }: any) => <em className="italic">{children}</em>,
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {messages.map((message, index) => (
        <div
          key={index}
          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[70%] rounded-2xl px-4 py-3 overflow-hidden ${
              message.role === "user"
                ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-secondary)]"
                : "bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-primary)]"
            }`}
          >
            {/* Icon */}
            <div className="flex items-start gap-2">
              {message.role === "assistant" && (
                <div className="mt-1 flex-shrink-0">
                  {agentImage ? (
                    <img 
                      src={agentImage} 
                      alt={agentName} 
                      className="w-6 h-6 rounded-full object-cover border border-[var(--border-primary)]" 
                    />
                  ) : (
                    <Bot className="w-4 h-4 text-[var(--text-secondary)]" />
                  )}
                </div>
              )}
              <div className="flex-1 prose prose-sm max-w-none prose-invert break-words overflow-hidden">
                {/* Always show the markdown message */}
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {message.content}
                </ReactMarkdown>
                
                {/* Routing info */}
                {message.routing?.wasRouted && (
                  <div className="mt-2 pt-2 border-t border-[var(--border-primary)] text-sm">
                    <div className="flex items-center gap-2 text-[var(--accent-secondary)]">
                      <ArrowRight className="w-4 h-4" />
                      <span>Routed to {message.routing.delegatedTo}</span>
                      {message.routing.price && (
                        <span className="text-[var(--text-muted)]">
                          ({message.routing.price} MNEE)
                        </span>
                      )}
                      {message.routing.isFreeConsultation && (
                        <span className="text-yellow-400 text-xs">(Free)</span>
                      )}
                    </div>
                    {message.routing.txHash && (
                      <div className="flex items-center gap-2 mt-1 text-green-400">
                        <CheckCircle className="w-3 h-3" />
                        <span className="text-xs font-mono">
                          Tx: {message.routing.txHash.slice(0, 10)}...
                        </span>
                      </div>
                    )}
                    
                    {/* Rating stars for routed responses */}
                    {message.routing.targetAgentId && userAddress && !ratedJobs.has(message.routing.targetAgentId + message.timestamp) && (
                      <RatingStars
                        agentId={message.routing.targetAgentId}
                        jobId={message.routing.targetAgentId + "-" + message.timestamp}
                        userAddress={userAddress}
                        agentName={message.routing.delegatedTo || "Agent"}
                        onRated={() => setRatedJobs(prev => new Set([...prev, message.routing!.targetAgentId! + message.timestamp]))}
                      />
                    )}
                  </div>
                )}

                {/* Multi-agent selection card */}
                {message.routing?.needsConfirmation && pendingConfirmation && (
                  <div className="mt-4 p-4 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-secondary)]">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border-primary)]">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-[var(--accent-primary)]" />
                        <span className="font-semibold text-[var(--text-primary)]">
                          {(message.routing.ownedAgents?.length || 0) + (message.routing.externalAgents?.length || 0)} Specialist{((message.routing.ownedAgents?.length || 0) + (message.routing.externalAgents?.length || 0)) > 1 ? 's' : ''} Found
                        </span>
                      </div>
                      {/* Sort dropdown */}
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as "jobs" | "rating")}
                        className="text-xs bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-2 py-1 text-[var(--text-secondary)]"
                      >
                        <option value="jobs">Sort by Jobs</option>
                        <option value="rating">Sort by Rating</option>
                      </select>
                    </div>

                    {/* Owned Agents (Free) */}
                    {message.routing.ownedAgents && message.routing.ownedAgents.length > 0 && (
                      <div className="mb-4">
                        <div className="text-xs text-yellow-400 mb-2 flex items-center gap-1">
                          <span>✨</span> Your Agents (Free Consultation)
                        </div>
                        <div className="space-y-2">
                          {[...message.routing.ownedAgents]
                            .sort((a, b) => sortBy === "jobs" 
                              ? (b.totalJobs || 0) - (a.totalJobs || 0)
                              : (b.averageRating || 0) - (a.averageRating || 0)
                            )
                            .map((agent) => (
                              <div key={agent.id} className="p-3 bg-[var(--bg-tertiary)] rounded-lg border border-yellow-500/30">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-[var(--text-primary)] truncate">{agent.name}</div>
                                    {agent.description && (
                                      <div className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{agent.description}</div>
                                    )}
                                    <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-secondary)]">
                                      <span className="flex items-center gap-1">
                                        <Briefcase className="w-3 h-3" /> {agent.totalJobs || 0} jobs
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Star className="w-3 h-3 text-yellow-400" /> {(agent.averageRating || 0).toFixed(1)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-1.5">
                                    <button
                                      onClick={() => onAutoForward?.(agent.id)}
                                      className="text-xs px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded font-medium hover:bg-yellow-500/30 transition-colors whitespace-nowrap"
                                    >
                                      Auto-forward
                                    </button>
                                    <a
                                      href={`/agents/${agent.id}`}
                                      className="text-xs px-3 py-1.5 bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded font-medium hover:bg-[var(--bg-primary)] transition-colors text-center whitespace-nowrap"
                                    >
                                      Chat directly
                                    </a>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* External Agents (Paid) */}
                    {message.routing.externalAgents && message.routing.externalAgents.length > 0 && (
                      <div>
                        {message.routing.ownedAgents && message.routing.ownedAgents.length > 0 && (
                          <div className="text-xs text-[var(--text-muted)] mb-2">Other Experts</div>
                        )}
                        <div className="space-y-2">
                          {[...message.routing.externalAgents]
                            .sort((a, b) => sortBy === "jobs" 
                              ? (b.totalJobs || 0) - (a.totalJobs || 0)
                              : (b.averageRating || 0) - (a.averageRating || 0)
                            )
                            .map((agent) => (
                              <div key={agent.id} className="p-3 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-primary)]">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-[var(--text-primary)] truncate">{agent.name}</div>
                                    {agent.description && (
                                      <div className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{agent.description}</div>
                                    )}
                                    <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-secondary)]">
                                      <span className="flex items-center gap-1">
                                        <Briefcase className="w-3 h-3" /> {agent.totalJobs || 0} jobs
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Star className="w-3 h-3 text-yellow-400" /> {(agent.averageRating || 0).toFixed(1)}
                                      </span>
                                      <span className="text-[var(--accent-primary)] font-medium">{agent.price} MNEE</span>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => onSelectAgent?.(agent.id)}
                                    className="text-xs px-3 py-1.5 btn-primary whitespace-nowrap"
                                  >
                                    Pay & Consult
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Legacy single-agent fallback */}
                    {!message.routing.multipleAgents && message.routing.pendingAgent && (
                      <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-primary)]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="font-medium text-[var(--text-primary)]">{message.routing.pendingAgent.name}</div>
                            {message.routing.pendingAgent.description && (
                              <div className="text-xs text-[var(--text-muted)] mt-1">{message.routing.pendingAgent.description}</div>
                            )}
                            <div className="text-[var(--accent-primary)] font-medium text-sm mt-2">{message.routing.pendingAgent.price} MNEE</div>
                          </div>
                          <button
                            onClick={onConfirmRouting}
                            className="text-xs px-3 py-1.5 btn-primary whitespace-nowrap"
                          >
                            Pay & Consult
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Cancel button */}
                    <button
                      onClick={onCancelRouting}
                      className="w-full mt-3 px-4 py-2 bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-lg text-sm font-medium hover:bg-[var(--bg-tertiary)] transition-colors border border-[var(--border-primary)]"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <p className="text-xs opacity-50 mt-2">
              {new Date(message.timestamp).toLocaleTimeString()}
            </p>
          </div>
        </div>
      ))}

      {isThinking && (
        <div className="flex justify-start">
          <div className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-2xl px-4 py-3">
            <div className="flex space-x-1 items-center">
              <div className="w-2 h-2 bg-[var(--text-secondary)] rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-2 h-2 bg-[var(--text-secondary)] rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-2 h-2 bg-[var(--text-secondary)] rounded-full animate-bounce" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
