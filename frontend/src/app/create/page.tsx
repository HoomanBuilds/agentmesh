"use client";

import Layout from "@/components/Layout";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseEther } from "viem";
import { Loader2, CheckCircle } from "lucide-react";
import AgentRegistryJSON from "@/constants/AgentRegistry.json";
import { REGISTRY_ADDRESS } from "@/lib/contracts";

const AgentRegistryABI = AgentRegistryJSON.abi;

export default function CreatePage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash });

  const [step, setStep] = useState<"form" | "confirm" | "updating" | "done">("form");
  const [agentUuid, setAgentUuid] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    system_prompt: "",
    price: "0.01",
  });
  const [error, setError] = useState("");

  // Read agent count to determine the new agent's on-chain ID
  const { data: agentCount, refetch: refetchCount } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: AgentRegistryABI,
    functionName: "agentCount",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isConnected || !address) return;

    setError("");

    try {
      // Step 1: Create agent in Supabase
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          system_prompt: form.system_prompt,
          price_per_call: parseEther(form.price).toString(),
          owner_address: address,
        }),
      });

      const { data, error: apiError } = await res.json();

      if (apiError) {
        setError(apiError);
        return;
      }

      setAgentUuid(data.id);
      setStep("confirm");

      // Step 2: Register on-chain
      writeContract({
        address: REGISTRY_ADDRESS,
        abi: AgentRegistryABI,
        functionName: "registerAgent",
        args: [parseEther(form.price), data.id],
      });
    } catch (err) {
      console.error("Error:", err);
      setError("Failed to create agent");
    }
  }

  useEffect(() => {
    async function updateOnchainId() {
      if (isSuccess && step === "confirm" && agentUuid) {
        setStep("updating");
        
        try {
          const { data: newCount } = await refetchCount();
          const onchainId = Number(newCount) - 1; 
          
          const res = await fetch(`/api/agents/${agentUuid}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ onchain_id: onchainId }),
          });

          if (!res.ok) {
            console.error("Failed to update onchain_id");
          }

          setStep("done");
        } catch (err) {
          console.error("Error updating onchain_id:", err);
          setStep("done");
        }
      }
    }

    updateOnchainId();
  }, [isSuccess, step, agentUuid, refetchCount]);

  return (
    <Layout>
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Create Agent</h1>
          <p className="text-[var(--text-secondary)] mb-8">
            Define your AI agent and set your price. No approval needed.
          </p>

          {step === "form" && (
            <form onSubmit={handleSubmit} className="card p-6 space-y-6">
              <div>
                <label className="label">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Code Reviewer"
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What does your agent do?"
                  className="textarea"
                  rows={3}
                />
              </div>

              <div>
                <label className="label">System Prompt</label>
                <textarea
                  value={form.system_prompt}
                  onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
                  placeholder="Define your agent's personality and capabilities..."
                  className="textarea"
                  rows={5}
                  required
                />
              </div>

              <div>
                <label className="label">Price per Call (MNEE)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="input"
                  required
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}

              <button
                type="submit"
                disabled={!isConnected || isPending}
                className="btn-primary w-full"
              >
                {!isConnected
                  ? "Connect Wallet"
                  : isPending
                  ? "Creating..."
                  : "Create Agent"}
              </button>
            </form>
          )}

          {step === "confirm" && (
            <div className="card p-6 text-center">
              <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" />
              <h2 className="text-xl font-semibold mb-2">Registering On-Chain</h2>
              <p className="text-[var(--text-secondary)]">
                Please confirm the transaction in your wallet...
              </p>
            </div>
          )}

          {step === "updating" && (
            <div className="card p-6 text-center">
              <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" />
              <h2 className="text-xl font-semibold mb-2">Finalizing</h2>
              <p className="text-[var(--text-secondary)]">
                Linking on-chain registration to database...
              </p>
            </div>
          )}

          {step === "done" && (
            <div className="card p-6 text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400" />
              <h2 className="text-xl font-semibold mb-2">Agent Created</h2>
              <p className="text-[var(--text-secondary)] mb-6">
                Your agent is now live and ready to receive requests.
              </p>
              <button
                onClick={() => router.push(`/agents/${agentUuid}`)}
                className="btn-primary"
              >
                View Agent
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
