"use client";

import Layout from "@/components/Layout";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Bot, Loader2, Copy, CheckCircle } from "lucide-react";
import { formatEther } from "viem";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ROUTER_ADDRESS, MNEE_ADDRESS, ESCROW_ADDRESS } from "@/lib/contracts";
import AgentRouterJSON from "@/constants/AgentRouter.json";
import MockMNEEJSON from "@/constants/MockMNEE.json";
import type { Agent } from "@/types";

const AgentRouterABI = AgentRouterJSON.abi;
const MockMNEEABI = MockMNEEJSON.abi;

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = params.id as string;
  const { address, isConnected } = useAccount();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [executing, setExecuting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("");

  // Contract write hooks
  const { writeContract: approve, data: approveHash, error: approveError } = useWriteContract();
  const { writeContract: requestService, data: requestHash, error: requestError } = useWriteContract();

  const { isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isSuccess: requestSuccess, data: requestReceipt } = useWaitForTransactionReceipt({ hash: requestHash });

  useEffect(() => {
    fetchAgent();
  }, [agentId]);

  async function fetchAgent() {
    try {
      const res = await fetch(`/api/agents/${agentId}`);
      const { data } = await res.json();
      setAgent(data);
    } catch (error) {
      console.error("Failed to fetch agent:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleTest() {
    if (!agent || !isConnected || agent.onchain_id === null) {
      console.log("Cannot test:", { agent, isConnected, onchain_id: agent?.onchain_id });
      return;
    }
    
    setExecuting(true);
    setOutput("");
    setStatus("Approving MNEE spend...");

    try {
      // Step 1: Approve MNEE
      approve({
        address: MNEE_ADDRESS,
        abi: MockMNEEABI,
        functionName: "approve",
        args: [ESCROW_ADDRESS, BigInt(agent.price_per_call)],
      });
    } catch (error) {
      console.error("Approve error:", error);
      setOutput("Failed to approve MNEE");
      setExecuting(false);
      setStatus("");
    }
  }

  useEffect(() => {
    if (approveError) {
      console.error("Approve error:", approveError);
      setOutput(`Approval failed: ${approveError.message}`);
      setExecuting(false);
      setStatus("");
    }
  }, [approveError]);

  useEffect(() => {
    if (approveSuccess && agent && agent.onchain_id !== null && executing) {
      setStatus("Requesting service (locking payment)...");
      requestService({
        address: ROUTER_ADDRESS,
        abi: AgentRouterABI,
        functionName: "requestService",
        args: [BigInt(agent.onchain_id), BigInt(0)],
      });
    }
  }, [approveSuccess, agent, executing]);

  useEffect(() => {
    if (requestError) {
      console.error("Request error:", requestError);
      setOutput(`Request failed: ${requestError.message}`);
      setExecuting(false);
      setStatus("");
    }
  }, [requestError]);

  useEffect(() => {
    if (requestSuccess && requestReceipt && executing) {
      setStatus("Executing agent with OpenAI...");
      
      const serviceRequestedTopic = "0x" + "ServiceRequested(bytes32,uint256,uint256,address,uint256)"
        .split("")
        .reduce((hash, char) => {
          return hash;
        }, "");
      
      const routerLog = requestReceipt.logs.find(
        (log) => log.address.toLowerCase() === ROUTER_ADDRESS.toLowerCase()
      );
      
      if (routerLog && routerLog.topics[1]) {
        const extractedJobId = routerLog.topics[1] as string;
        console.log("Extracted jobId:", extractedJobId);
        executeAgent(extractedJobId);
      } else {
        console.log("All logs:", requestReceipt.logs);
        for (const log of requestReceipt.logs) {
          console.log("Log address:", log.address, "topics:", log.topics);
        }
        setOutput("Failed to extract jobId from transaction. Check console for details.");
        setExecuting(false);
        setStatus("");
      }
    }
  }, [requestSuccess, requestReceipt, executing]);

  async function executeAgent(jobId: string) {
    try {
      const res = await fetch(`/api/agents/${agentId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, input }),
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
      setStatus("");
    }
  }

  function copyToClipboard() {
    if (agent) {
      navigator.clipboard.writeText(agent.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!agent) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Bot className="w-12 h-12 mb-4 text-[var(--text-muted)]" />
          <h2 className="text-xl font-semibold mb-2">Agent not found</h2>
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
              <div className="w-16 h-16 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center flex-shrink-0">
                <Bot className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold">{agent.name}</h1>
                  {agent.onchain_id !== null && (
                    <span className="px-2 py-0.5 text-xs bg-[var(--bg-tertiary)] rounded">
                      #{agent.onchain_id}
                    </span>
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

            {status && (
              <div className="flex items-center gap-2 mb-4 text-sm text-[var(--text-secondary)]">
                <Loader2 className="w-4 h-4 animate-spin" />
                {status}
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
    </Layout>
  );
}
