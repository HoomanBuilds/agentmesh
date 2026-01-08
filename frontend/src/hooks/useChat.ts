"use client";

import { useState, useCallback, useEffect } from "react";

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
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

export interface ChatSession {
  sessionId: string;
  lastMessage: string;
  timestamp: number;
  messageCount: number;
}

interface UseChatOptions {
  agentId: string | null;
  agentOnchainId: number | null;
  userAddress: string | null;
  initialSessionId?: string;
}

export function useChat({
  agentId,
  agentOnchainId,
  userAddress,
  initialSessionId,
}: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(
    initialSessionId || null
  );
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    agentId: string;
    originalMessage: string;
  } | null>(null);

  // Fetch sessions when agent changes
  useEffect(() => {
    async function fetchSessions() {
      if (!agentOnchainId || !userAddress) return;

      try {
        const res = await fetch(
          `/api/chat/sessions?agentId=${agentOnchainId}&userAddress=${userAddress}`
        );
        if (res.ok) {
          const data = await res.json();
          setSessions(data.sessions || []);
        }
      } catch (error) {
        console.error("Error fetching sessions:", error);
      }
    }

    fetchSessions();
  }, [agentOnchainId, userAddress]);

  // Load session messages when sessionId changes
  useEffect(() => {
    async function loadSession() {
      if (!agentOnchainId || !userAddress || !currentSessionId) return;

      setIsLoadingHistory(true);
      try {
        const res = await fetch(
          `/api/chat/history?agentId=${agentOnchainId}&userAddress=${userAddress}&sessionId=${currentSessionId}&limit=100`
        );
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch (error) {
        console.error("Error loading session:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    }

    loadSession();
  }, [agentOnchainId, userAddress, currentSessionId]);

  const selectSession = useCallback(async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setMessages([]);
  }, []);

  const createNewSession = useCallback(() => {
    const newSessionId = `session_${Date.now()}`;
    setCurrentSessionId(newSessionId);
    setMessages([]);
    return newSessionId;
  }, []);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !agentId || !userAddress || isSending || !currentSessionId) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          message: userMessage.content,
          userAddress,
          sessionId: currentSessionId,
          enableRouting: true,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Error: ${data.error}`,
            timestamp: Date.now(),
          },
        ]);
      } else if (data.routing?.needsConfirmation) {
        // Routing needs user confirmation
        setPendingConfirmation({
          agentId: data.routing.pendingAgent.id,
          originalMessage: userMessage.content,
        });
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.response,
            timestamp: Date.now(),
            routing: data.routing,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.response,
            timestamp: Date.now(),
            routing: data.routing,
          },
        ]);
      }

      // Refresh sessions
      if (agentOnchainId && userAddress) {
        const sessionsRes = await fetch(
          `/api/chat/sessions?agentId=${agentOnchainId}&userAddress=${userAddress}`
        );
        if (sessionsRes.ok) {
          const sessionsData = await sessionsRes.json();
          setSessions(sessionsData.sessions || []);
        }
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }, [input, agentId, agentOnchainId, userAddress, isSending, currentSessionId]);

  const confirmRouting = useCallback(async () => {
    if (!pendingConfirmation || !agentId || !userAddress || !currentSessionId) return;

    const confirmedAgent = pendingConfirmation;
    setPendingConfirmation(null);
    
    setIsSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          message: confirmedAgent.originalMessage,
          userAddress,
          sessionId: currentSessionId,
          enableRouting: true,
          confirmRouting: true,
          pendingAgentId: confirmedAgent.agentId,
        }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
          timestamp: Date.now(),
          routing: data.routing,
        },
      ]);
    } catch (error) {
      console.error("Error confirming routing:", error);
    } finally {
      setIsSending(false);
    }
  }, [pendingConfirmation, agentId, userAddress, currentSessionId]);

  const cancelRouting = useCallback(async () => {
    if (!agentId || !userAddress || !currentSessionId) return;

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "Understood. I'll try to help you directly instead.",
        timestamp: Date.now(),
      },
    ]);
    setPendingConfirmation(null);
  }, [agentId, userAddress, currentSessionId]);

  return {
    messages,
    sessions,
    currentSessionId,
    input,
    setInput,
    isSending,
    isLoadingHistory,
    sendMessage,
    selectSession,
    createNewSession,
    pendingConfirmation,
    confirmRouting,
    cancelRouting,
  };
}
