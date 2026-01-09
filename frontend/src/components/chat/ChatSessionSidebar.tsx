"use client";

import { Plus, MessageSquare, Trash2, X } from "lucide-react";
import { ChatSession } from "@/hooks/useChat";

interface ChatSessionSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  agentName?: string;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  onDeleteSession?: (sessionId: string) => void;
}

export default function ChatSessionSidebar({
  isOpen,
  onClose,
  agentName,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
}: ChatSessionSidebarProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Sidebar - Positioned relative to chat area */}
      <div className="absolute left-0 top-0 bottom-0 w-80 bg-[var(--bg-secondary)] border-r border-[var(--border-primary)] z-50 flex flex-col animate-in slide-in-from-left duration-200">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border-primary)] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              {agentName || "Chat"}
            </h2>
            <p className="text-xs text-[var(--text-muted)]">Chat History</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3 border-b border-[var(--border-primary)]">
          <button
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full px-4 py-3 bg-white text-black rounded-xl font-semibold hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Chat
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {sessions.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-[var(--text-muted)]" />
              </div>
              <p className="text-sm font-medium text-[var(--text-muted)]">
                No chat history
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Start a new conversation
              </p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.sessionId}
                className={`group relative p-3 rounded-xl cursor-pointer transition-all ${
                  currentSessionId === session.sessionId
                    ? "bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30"
                    : "bg-[var(--bg-tertiary)] border border-[var(--border-primary)] hover:bg-[var(--accent-primary)]/5"
                }`}
                onClick={() => {
                  onSelectSession(session.sessionId);
                  onClose();
                }}
              >
                <div className="font-medium text-[var(--text-primary)] text-sm truncate mb-1 pr-8">
                  {session.lastMessage 
                    ? session.lastMessage.slice(0, 40) + (session.lastMessage.length > 40 ? "..." : "")
                    : "New conversation"
                  }
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-1 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-[var(--accent-primary)]/50" />
                  {new Date(session.timestamp).toLocaleDateString()}
                  <span className="ml-2">{session.messageCount} messages</span>
                </div>

                {/* Delete button */}
                {onDeleteSession && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.sessionId);
                    }}
                    className="absolute top-3 right-3 p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 rounded transition-all"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
