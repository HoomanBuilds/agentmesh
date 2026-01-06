"use client";

import Layout from "@/components/Layout";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { CheckCircle } from "lucide-react";
import { useRegisterAgent, useAgentCount } from "@/hooks";
import { LoadingSpinner, EmptyState } from "@/components/ui";

export default function CreatePage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  
  const { register, status: registerStatus, transactionHash, error: registerError } = useRegisterAgent();
  const { count: agentCount, refetch: refetchCount } = useAgentCount();

  const [step, setStep] = useState<"form" | "confirm" | "updating" | "done">("form");
  const [agentUuid, setAgentUuid] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    system_prompt: "",
    price: "0.01",
  });
  const [error, setError] = useState("");

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
          price_per_call: (parseFloat(form.price) * 1e18).toString(),
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

      // Step 2: Register on-chain using the hook
      register(data.id, form.price);
    } catch (err) {
      console.error("Error creating agent:", err);
      setError("Failed to create agent");
    }
  }

  // Handle registration success
  useEffect(() => {
    async function updateOnchainId() {
      if (registerStatus === "success" && step === "confirm" && agentUuid) {
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
            console.error("Failed to update onchain_id in Supabase");
          }

          setStep("done");
        } catch (err) {
          console.error("Error updating onchain_id:", err);
          setStep("done");
        }
      }
    }
    updateOnchainId();
  }, [registerStatus, step, agentUuid, refetchCount]);

  // Handle registration error
  useEffect(() => {
    if (registerError) {
      setError(registerError);
      setStep("form");
    }
  }, [registerError]);

  if (!isConnected) {
    return (
      <Layout>
        <div className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl mx-auto">
            <EmptyState
              title="Connect Your Wallet"
              description="Connect your wallet to create an agent"
              action={{ label: "Go Home", href: "/" }}
            />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Create Agent</h1>

          {step === "done" ? (
            <div className="card p-8 text-center">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
              <h2 className="text-2xl font-bold mb-2">Agent Created!</h2>
              <p className="text-[var(--text-secondary)] mb-6">
                Your agent is now live on-chain
              </p>
              <button
                onClick={() => router.push(`/agents/${agentUuid}`)}
                className="btn-primary"
              >
                View Agent
              </button>
            </div>
          ) : step === "confirm" || step === "updating" ? (
            <div className="card p-8 text-center">
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                {step === "confirm" ? "Confirm Transaction" : "Updating Database..."}
              </h2>
              <p className="text-[var(--text-secondary)]">
                {step === "confirm"
                  ? "Please confirm the transaction in your wallet"
                  : "Linking on-chain ID to database..."}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="card p-6 space-y-6">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="label">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Code Reviewer Pro"
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Reviews code and suggests improvements..."
                  className="textarea"
                  rows={3}
                />
              </div>

              <div>
                <label className="label">System Prompt</label>
                <textarea
                  value={form.system_prompt}
                  onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
                  placeholder="You are an expert code reviewer..."
                  className="textarea"
                  rows={4}
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

              <button
                type="submit"
                disabled={registerStatus === "pending" || registerStatus === "confirming"}
                className="btn-primary w-full"
              >
                {registerStatus === "pending" ? "Creating..." : "Create Agent"}
              </button>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}
