"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, ArrowRight, CheckCircle, XCircle, Coins } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  routing?: {
    wasRouted?: boolean;
    delegatedTo?: string | null;
    needsConfirmation?: boolean;
    pendingAgent?: {
      id: string;
      name: string;
      description: string;
      price: string;
      onchainId: number;
    };
    hasBalance?: boolean;
    txHash?: string;
    price?: string;
  };
}

interface AgentChatProps {
  agentId: string;
  agentName: string;
  userAddress: string;
}

export default function AgentChat({ agentId, agentName, userAddress }: AgentChatProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    agentId: string;
    originalMessage: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          message: userMessage,
          userAddress,
          enableRouting: true,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${data.error}` },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.response,
            routing: data.routing,
          },
        ]);

        // Check if confirmation is needed
        if (data.routing?.needsConfirmation && data.routing?.pendingAgent) {
          setPendingConfirmation({
            agentId: data.routing.pendingAgent.id,
            originalMessage: userMessage,
          });
        }
      }
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${error.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConfirmRouting(confirmed: boolean) {
    if (!pendingConfirmation) return;

    setIsLoading(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: confirmed ? "Yes, proceed" : "No, cancel" },
    ]);

    if (!confirmed) {
      setPendingConfirmation(null);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "No problem! Let me try to help you directly instead." },
      ]);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          message: pendingConfirmation.originalMessage,
          userAddress,
          enableRouting: true,
          confirmRouting: true,
          pendingAgentId: pendingConfirmation.agentId,
        }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
          routing: data.routing,
        },
      ]);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${error.message}` },
      ]);
    } finally {
      setPendingConfirmation(null);
      setIsLoading(false);
    }
  }

  return (
    <div className="card flex flex-col h-[500px]">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-default)]">
        <h3 className="font-semibold flex items-center gap-2">
          <Bot className="w-5 h-5" />
          Chat with {agentName}
        </h3>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Agent can route to other specialists if needed
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-[var(--text-muted)] py-8">
            <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Start a conversation with {agentName}</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-[var(--accent-primary)] flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.role === "user"
                  ? "bg-[var(--accent-primary)] text-white"
                  : "bg-[var(--bg-tertiary)]"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              
              {/* Show routing success info */}
              {msg.routing?.wasRouted && msg.routing.delegatedTo && (
                <div className="mt-2 pt-2 border-t border-white/20 space-y-1 text-xs opacity-75">
                  <div className="flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" />
                    Consulted: {msg.routing.delegatedTo}
                  </div>
                  {msg.routing.price && (
                    <div className="flex items-center gap-1">
                      <Coins className="w-3 h-3" />
                      Paid: {msg.routing.price} MNEE
                    </div>
                  )}
                </div>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--accent-primary)] flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-[var(--bg-tertiary)] rounded-lg p-3">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Confirmation Buttons */}
      {pendingConfirmation && !isLoading && (
        <div className="p-4 border-t border-[var(--border-default)] bg-[var(--bg-tertiary)]">
          <p className="text-sm mb-3 text-center">Proceed with consultation?</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => handleConfirmRouting(true)}
              className="btn-primary flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Yes, Pay & Proceed
            </button>
            <button
              onClick={() => handleConfirmRouting(false)}
              className="btn-secondary flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      {!pendingConfirmation && (
        <form onSubmit={handleSubmit} className="p-4 border-t border-[var(--border-default)]">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              className="input flex-1"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="btn-primary px-4"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
