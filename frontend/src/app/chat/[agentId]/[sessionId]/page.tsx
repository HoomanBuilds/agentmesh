"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Menu, Loader2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import Layout from "@/components/Layout";
import { useChat } from "@/hooks/useChat";
import { useAgents } from "@/hooks/useAgents";
import { useAgentWallet } from "@/hooks/useAgentWallet";
import {
  ChatMessages,
  ChatInput,
  ChatSessionSidebar,
  AgentIconBar,
  AgentInfoPanel,
} from "@/components/chat";
import { EmptyState } from "@/components/ui";

interface Agent {
  id: string;
  name: string;
  description: string;
  onchain_id: number;
  image_url?: string;
  price_per_call: string;
  owner_address?: string;
}

export default function ChatSessionPage({
  params,
}: {
  params: Promise<{ agentId: string; sessionId: string }>;
}) {
  const router = useRouter();
  const { agentId, sessionId } = use(params);
  const { address, isConnected } = useAccount();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoadingAgent, setIsLoadingAgent] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Track previous address to detect wallet changes
  const previousAddressRef = useRef<string | undefined>(address);

  // Check if current user is the owner of the agent
  const isOwner = agent && address 
    ? agent.owner_address?.toLowerCase() === address.toLowerCase() 
    : false;

  // Fetch all agents for sidebar (only owned agents)
  const { agents: allAgents, loading: agentsLoading } = useAgents(address);

  // Fetch agent wallet info
  const { wallet } = useAgentWallet(agent?.onchain_id ?? null);

  // Security: Redirect when wallet changes OR when non-owner tries to access
  useEffect(() => {
    if (!isLoadingAgent && agent && address) {
      const ownsAgent = agent.owner_address?.toLowerCase() === address.toLowerCase();
      
      if (!ownsAgent) {
        // Non-owner trying to access chat - redirect to agents page
        router.replace("/agents");
        return;
      }
    }

    // If wallet changed, redirect to new session
    if (previousAddressRef.current && address && previousAddressRef.current !== address) {
      const newSessionId = uuidv4();
      router.replace(`/chat/${agentId}/${newSessionId}`);
    }
    previousAddressRef.current = address;
  }, [address, agentId, router, agent, isLoadingAgent]);

  // Fetch agent data
  useEffect(() => {
    async function fetchAgent() {
      setIsLoadingAgent(true);
      try {
        const res = await fetch(`/api/agents/${agentId}`);
        if (res.ok) {
          const data = await res.json();
          setAgent(data.data);
        }
      } catch (error) {
        console.error("Error fetching agent:", error);
      } finally {
        setIsLoadingAgent(false);
      }
    }

    if (agentId) {
      fetchAgent();
    }
  }, [agentId]);

  const {
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
  } = useChat({
    agentId: agent?.id || null,
    agentOnchainId: agent?.onchain_id || null,
    userAddress: address || null,
    initialSessionId: sessionId,
  });

  const handleSelectSession = (newSessionId: string) => {
    selectSession(newSessionId);
    window.history.pushState(null, "", `/chat/${agentId}/${newSessionId}`);
  };

  const handleNewChat = () => {
    const newSessionId = uuidv4();
    createNewSession();
    window.history.pushState(null, "", `/chat/${agentId}/${newSessionId}`);
  };

  if (!isConnected) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
          <EmptyState
            title="Connect Your Wallet"
            description="Please connect your wallet to chat with AI agents"
            icon="wallet"
          />
        </div>
      </Layout>
    );
  }

  if (isLoadingAgent) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--text-muted)]" />
        </div>
      </Layout>
    );
  }

  if (!agent) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
          <EmptyState
            title="Agent Not Found"
            description="The agent you're looking for doesn't exist"
            icon="bot"
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Sidebar - Agent Icons */}
        <AgentIconBar
          agents={allAgents}
          isLoading={agentsLoading}
          selectedAgentId={agentId}
        />

        {/* Center Panel - Agent Info */}
        <AgentInfoPanel
          agent={agent}
          walletAddress={wallet?.address}
          walletBalance={wallet?.mneeBalance}
        />

        {/* Right Panel - Chat Area */}
        <div className="flex-1 flex flex-col relative bg-[var(--bg-primary)]">
          {/* Hamburger for session history - LEFT side */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-4 left-4 z-10 p-3 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl hover:bg-[var(--bg-surface)] transition-all"
            title="View chat sessions"
          >
            <Menu className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>

          {/* Messages */}
          {isLoadingHistory ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--text-muted)]" />
            </div>
          ) : (
            <ChatMessages
              messages={messages}
              agentName={agent.name}
              agentImage={agent.image_url}
              isThinking={isSending}
              onConfirmRouting={confirmRouting}
              onCancelRouting={cancelRouting}
              pendingConfirmation={!!pendingConfirmation}
            />
          )}

          {/* Input */}
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={sendMessage}
            isSending={isSending}
            agentName={agent.name}
          />

          {/* Session Sidebar */}
          <ChatSessionSidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            agentName={agent.name}
            sessions={sessions}
            currentSessionId={currentSessionId}
            onSelectSession={handleSelectSession}
            onNewChat={handleNewChat}
          />
        </div>
      </div>
    </Layout>
  );
}
