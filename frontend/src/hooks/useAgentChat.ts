"use client";

import { useState, useCallback } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface UseAgentChatOptions {
  agentId: string;
  userAddress: string;
  sessionId?: string;
  onError?: (error: string) => void;
}

/**
 * Hook for chatting with an AI agent
 */
export function useAgentChat({
  agentId,
  userAddress,
  sessionId = "default",
  onError,
}: UseAgentChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    setIsLoading(true);
    setError(null);

    const userMessage: Message = {
      role: "user",
      content,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          message: content,
          sessionId,
          userAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setError(err.message);
      onError?.(err.message);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  }, [agentId, userAddress, sessionId, onError]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
  };
}
