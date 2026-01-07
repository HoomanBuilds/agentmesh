"use client";

import Layout from "@/components/Layout";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Bot, Copy, CheckCircle, Edit } from "lucide-react";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { useAgent, useRequestService } from "@/hooks";
import { PageLoader, EmptyState, LoadingSpinner } from "@/components/ui";
import { AgentWallet, AgentImage, EditAgentModal } from "@/components/agent";

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = params.id as string;
  const { isConnected, address } = useAccount();
  const { agent, loading } = useAgent(agentId);

  const isOwner = address && agent ? address.toLowerCase() === agent.owner_address?.toLowerCase() : false;

  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const { 
    requestService, 
    jobId, 
    status: serviceStatus, 
    error: serviceError,
    reset: resetService 
  } = useRequestService();

  // Execute agent when jobId is received
  useEffect(() => {
    if (serviceStatus === "success" && jobId && executing) {
      executeAgent(jobId);
    }
  }, [serviceStatus, jobId, executing]);

  // Handle service error
  useEffect(() => {
    if (serviceError && executing) {
      setOutput(`Error: ${serviceError}`);
      setExecuting(false);
      resetService();
    }
  }, [serviceError, executing, resetService]);

  async function handleTest() {
    if (!agent || !isConnected || agent.onchain_id === null) {
      console.log("Cannot test:", { agent, isConnected, onchain_id: agent?.onchain_id });
      return;
    }
    
    setExecuting(true);
    setOutput("");
    resetService();
    
    requestService(agent.onchain_id, BigInt(agent.price_per_call));
  }

  async function executeAgent(jobIdValue: string) {
    try {
      const res = await fetch(`/api/agents/${agentId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: jobIdValue, input }),
      });
      const data = await res.json();
      
      if (data.error) {
        setOutput(`Error: ${data.error}`);
      } else {
        setOutput(data.output || "No output received");
      }
    } catch (error) {
      console.error("Execute error:", error);
      setOutput("Failed to execute agent");
    } finally {
      setExecuting(false);
      resetService();
    }
  }

  function copyToClipboard() {
    if (agent) {
      navigator.clipboard.writeText(agent.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function getStatusMessage(): string {
    switch (serviceStatus) {
      case "approving":
        return "Approving MNEE spend...";
      case "requesting":
        return "Requesting service (locking payment)...";
      case "success":
        return "Executing agent with OpenAI...";
      default:
        return "";
    }
  }

  if (loading) {
    return (
      <Layout>
        <PageLoader />
      </Layout>
    );
  }

  if (!agent) {
    return (
      <Layout>
        <div className="py-12 px-4">
          <div className="max-w-xl mx-auto">
            <EmptyState
              title="Agent not found"
              description="This agent doesn't exist or has been removed"
              action={{ label: "Browse Agents", href: "/agents" }}
            />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="card p-6 mb-6">
            <div className="flex items-start gap-4">
              <AgentImage 
                imageUrl={agent.image_url} 
                name={agent.name} 
                size="lg" 
              />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold">{agent.name}</h1>
                    {agent.onchain_id !== null && (
                      <span className="px-2 py-0.5 text-xs bg-[var(--bg-tertiary)] rounded">
                        #{agent.onchain_id}
                      </span>
                    )}
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="btn-secondary text-sm flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                </div>
                <p className="text-[var(--text-secondary)] mb-4">
                  {agent.description || "No description"}
                </p>
                <div className="flex items-center gap-4">
                  <span className="text-lg font-semibold">
                    {formatEther(BigInt(agent.price_per_call))} MNEE
                  </span>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied" : "Copy ID"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Agent Wallet */}
          {agent.onchain_id !== null && (
            <div className="mb-6">
              <AgentWallet agentId={agent.onchain_id} isOwner={isOwner} />
            </div>
          )}

          {/* Test Panel */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4">Test Agent</h2>
            
            <div className="mb-4">
              <label className="label">Input</label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter your prompt..."
                className="textarea"
                rows={4}
              />
            </div>

            <button
              onClick={handleTest}
              disabled={!isConnected || !input || executing || agent.onchain_id === null}
              className="btn-primary w-full mb-4"
            >
              {!isConnected
                ? "Connect Wallet"
                : agent.onchain_id === null
                ? "Agent Not On-chain"
                : executing
                ? "Processing..."
                : `Test (${formatEther(BigInt(agent.price_per_call))} MNEE)`}
            </button>

            {executing && serviceStatus !== "idle" && (
              <div className="flex items-center gap-2 mb-4 text-sm text-[var(--text-secondary)]">
                <LoadingSpinner size="sm" />
                {getStatusMessage()}
              </div>
            )}

            {output && (
              <div>
                <label className="label">Output</label>
                <div className="bg-[var(--bg-tertiary)] rounded-lg p-4 text-sm whitespace-pre-wrap max-h-96 overflow-auto">
                  {output}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {agent && (
        <EditAgentModal
          agent={agent}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={(updates) => {
            window.location.reload();
          }}
        />
      )}
    </Layout>
  );
}
