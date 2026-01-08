"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { CheckCircle, Upload, X, Image as ImageIcon } from "lucide-react";
import imageCompression from "browser-image-compression";
import Layout from "@/components/Layout";
import { useRegisterAgent, useAgentCount } from "@/hooks";
import { LoadingSpinner, EmptyState } from "@/components/ui";
import { motion } from "framer-motion";

export default function CreatePage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  
  const { register, status: registerStatus, transactionHash, error: registerError } = useRegisterAgent();
  const { count: agentCount, refetch: refetchCount } = useAgentCount();

  const [step, setStep] = useState<"form" | "uploading_image" | "confirm" | "updating" | "done">("form");
  const [agentUuid, setAgentUuid] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    system_prompt: "",
    price: "0.01",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);

      try {
        const options = {
          maxSizeMB: 0.1, 
          maxWidthOrHeight: 512,
          useWebWorker: true,
          fileType: "image/jpeg"
        };
        
        const compressedFile = await imageCompression(file, options);
        setImageFile(compressedFile);
      } catch (error) {
        console.error("Error compressing image:", error);
        setError("Failed to process image. Please try another one.");
      }
    }
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  };

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
      
      // Step 1.5: Upload Image if exists
      if (imageFile) {
        setStep("uploading_image");
        const formData = new FormData();
        formData.append("file", imageFile);
        formData.append("agentId", data.id);

        const uploadRes = await fetch("/api/upload-image", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          console.error("Failed to upload image");
        }
      }

      // Step 2: Get the next agent ID (current count = next ID)
      const { data: currentCount } = await refetchCount();
      const nextAgentId = Number(currentCount || 0);
      
      // Step 3: Get the wallet address for this agent ID from backend
      const walletRes = await fetch(`/api/agent-wallet/info?agentId=${nextAgentId}`);
      const { data: walletData } = await walletRes.json();
      
      if (!walletData?.address) {
        setError("Failed to get agent wallet address");
        return;
      }
      
      setStep("confirm");

      // Step 4: Register on-chain with wallet address
      register(form.price, data.id, walletData.address);
    } catch (err) {
      console.error("Error creating agent:", err);
      setError("Failed to create agent");
      setStep("form");
    }
  }

  useEffect(() => {
    async function updateOnchainId() {
      if (registerStatus === "success" && step === "confirm" && agentUuid && address) {
        setStep("updating");
        
        try {
          const { data: newCount } = await refetchCount();
          const onchainId = Number(newCount) - 1; 
          
          const res = await fetch(`/api/agents/${agentUuid}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              onchain_id: onchainId,
              ownerAddress: address  
            }),
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
  }, [registerStatus, step, agentUuid, refetchCount, address]);

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
        <div className="py-12">
          <div className="max-w-xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <EmptyState
                title="Connect Your Wallet"
                description="Connect your wallet to create an agent"
                action={{ label: "Go Home", href: "/" }}
              />
            </motion.div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-xl mx-auto px-6"
        >
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
          ) : step === "confirm" || step === "updating" || step === "uploading_image" ? (
            <div className="card p-8 text-center">
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                {step === "uploading_image" 
                  ? "Uploading Image..." 
                  : step === "confirm" 
                    ? "Confirm Transaction" 
                    : "Updating Database..."}
              </h2>
              <p className="text-[var(--text-secondary)]">
                {step === "uploading_image"
                  ? "Optimizing and uploading your agent's photo..."
                  : step === "confirm"
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

              {/* Image Upload */}
              <div>
                <label className="label">Agent Photo</label>
                <div className="mt-2">
                  {imagePreview ? (
                    <div className="relative w-32 h-32">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full h-full object-cover rounded-xl border border-[var(--border-primary)]"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-[var(--border-primary)] border-dashed rounded-xl cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 mb-2 text-[var(--text-muted)]" />
                          <p className="text-sm text-[var(--text-muted)]">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">
                            JPEG, PNG, WebP (MAX. 5MB)
                          </p>
                        </div>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={handleImageSelect}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

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
        </motion.div>
      </div>
    </Layout>
  );
}
