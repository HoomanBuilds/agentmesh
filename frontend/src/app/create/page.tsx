"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { CheckCircle, Upload, X } from "lucide-react";
import imageCompression from "browser-image-compression";
import Layout from "@/components/Layout";
import { useRegisterAgent, useAgentCount } from "@/hooks";
import { LoadingSpinner, EmptyState } from "@/components/ui";
import { motion } from "framer-motion";
import { KnowledgeBaseUpload, AgentPreviewCard } from "@/components/create";
import { uploadKnowledgeBase } from "@/lib/knowledge-base";

export default function CreatePage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  
  const { register, status: registerStatus, error: registerError } = useRegisterAgent();
  const { refetch: refetchCount } = useAgentCount();

  const [step, setStep] = useState<"form" | "uploading_image" | "confirm" | "updating" | "uploading_kb" | "done">("form");
  const [agentUuid, setAgentUuid] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    system_prompt: "",
    price: "0.01",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [kbFiles, setKbFiles] = useState<File[]>([]);
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
      } catch (err) {
        console.error("Error compressing image:", err);
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

  // Store form data for after on-chain confirmation
  const [pendingFormData, setPendingFormData] = useState<{
    name: string;
    description: string;
    system_prompt: string;
    price: string;
    imageFile: File;
    walletAddress: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isConnected || !address) return;

    if (!imageFile) {
      setError("Please upload an agent photo");
      return;
    }

    setError("");

    try {
      // Step 1: Get the next agent ID (for wallet derivation)
      const { data: currentCount } = await refetchCount();
      const nextAgentId = Number(currentCount || 0);
      
      // Step 2: Get the agent wallet address
      const walletRes = await fetch(`/api/agent-wallet/info?agentId=${nextAgentId}`);
      const { data: walletData } = await walletRes.json();
      
      if (!walletData?.address) {
        setError("Failed to get agent wallet address");
        return;
      }
      
      // Step 3: Store form data for after on-chain confirmation
      setPendingFormData({
        name: form.name,
        description: form.description,
        system_prompt: form.system_prompt,
        price: form.price,
        imageFile: imageFile,
        walletAddress: walletData.address,
      });
      
      // Step 4: Register on-chain
      setStep("confirm");
      register(form.price, `agent-${nextAgentId}`, walletData.address);
    } catch (err) {
      console.error("Error preparing agent registration:", err);
      setError("Failed to prepare agent registration");
      setStep("form");
    }
  }

  // Handle successful on-chain registration
  useEffect(() => {
    async function saveAgentToDatabase() {
      if (registerStatus === "success" && step === "confirm" && pendingFormData && address) {
        setStep("updating");
        
        try {
          const { data: newCount } = await refetchCount();
          const onchainId = Number(newCount) - 1;
          
          // Step 5: Upload image FIRST
          setStep("uploading_image");
          const formData = new FormData();
          formData.append("file", pendingFormData.imageFile);
          formData.append("agentId", `temp-${Date.now()}`); 

          const uploadRes = await fetch("/api/upload-image", {
            method: "POST",
            body: formData,
          });

          let imageUrl = null;
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            imageUrl = uploadData.data?.url || uploadData.url;
          }
          
          // Step 6: save to Supabase
          setStep("updating");
          const res = await fetch("/api/agents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: pendingFormData.name,
              description: pendingFormData.description,
              system_prompt: pendingFormData.system_prompt,
              price_per_call: (parseFloat(pendingFormData.price) * 1e18).toString(),
              owner_address: address,
              onchain_id: onchainId,
              image_url: imageUrl,
            }),
          });

          const { data, error: apiError } = await res.json();

          if (apiError) {
            setError(apiError);
            setStep("form");
            return;
          }

          setAgentUuid(data.id);

          // Step 7: Upload knowledge base if any
          if (kbFiles.length > 0) {
            setStep("uploading_kb");
            const result = await uploadKnowledgeBase(data.id, kbFiles);
            if (!result.success) {
              console.error("KB upload failed:", result.error);
            }
          }

          setStep("done");
          setPendingFormData(null);
        } catch (err) {
          console.error("Error saving agent:", err);
          setError("Agent registered on-chain but failed to save to database. Please contact support.");
          setStep("form");
        }
      }
    }
    saveAgentToDatabase();
  }, [registerStatus, step, pendingFormData, refetchCount, address, kbFiles]);

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
        <div className="max-w-5xl mx-auto px-6">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold mb-8"
          >
            Create Agent
          </motion.h1>

          {step === "done" ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-xl mx-auto card p-8 text-center"
            >
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
            </motion.div>
          ) : step !== "form" ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-xl mx-auto card p-8 text-center"
            >
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                {step === "uploading_image" && "Uploading Image..."}
                {step === "confirm" && "Confirm Transaction"}
                {step === "uploading_kb" && "Uploading Knowledge Base..."}
                {step === "updating" && "Updating Database..."}
              </h2>
              <p className="text-[var(--text-secondary)]">
                {step === "uploading_image" && "Optimizing and uploading your agent's photo..."}
                {step === "confirm" && "Please confirm the transaction in your wallet"}
                {step === "uploading_kb" && "Processing and indexing your knowledge base files..."}
                {step === "updating" && "Linking on-chain ID to database..."}
              </p>
            </motion.div>
          ) : (
            <div className="grid lg:grid-cols-[1fr_320px] gap-8">
              {/* Form */}
              <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                onSubmit={handleSubmit}
                className="card p-6 space-y-6"
              >
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* Image Upload */}
                <div>
                  <label className="label">
                    Agent Photo <span className="text-red-400">*</span>
                  </label>
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
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-[var(--border-primary)] border-dashed rounded-xl cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors">
                        <Upload className="w-8 h-8 mb-2 text-[var(--text-muted)]" />
                        <p className="text-sm text-[var(--text-muted)]">
                          <span className="font-semibold">Click to upload</span>
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          JPEG, PNG, WebP (MAX. 5MB)
                        </p>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={handleImageSelect}
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div>
                  <label className="label">Name <span className="text-red-400">*</span></label>
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
                  <label className="label">System Prompt <span className="text-red-400">*</span></label>
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
                  <label className="label">Price per Call (MNEE) <span className="text-red-400">*</span></label>
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

                <KnowledgeBaseUpload
                  files={kbFiles}
                  onFilesChange={setKbFiles}
                  onError={setError}
                />

                <button
                  type="submit"
                  disabled={registerStatus === "pending" || registerStatus === "confirming"}
                  className="btn-primary w-full"
                >
                  {registerStatus === "pending" ? "Creating..." : "Create Agent"}
                </button>
              </motion.form>

              {/* Preview Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <AgentPreviewCard
                  imagePreview={imagePreview}
                  name={form.name}
                  price={form.price}
                />
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
