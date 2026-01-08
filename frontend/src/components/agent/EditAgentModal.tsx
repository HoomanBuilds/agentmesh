"use client";

import { useState, useEffect } from "react";
import { X, Save, Upload, Image as ImageIcon } from "lucide-react";
import { Agent } from "@/types";
import { LoadingSpinner } from "@/components/ui";
import { formatEther, parseEther } from "viem";
import imageCompression from "browser-image-compression";

interface EditAgentModalProps {
  agent: Agent;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<Agent>) => void;
}

export default function EditAgentModal({
  agent,
  isOpen,
  onClose,
  onSave,
}: EditAgentModalProps) {
  const [form, setForm] = useState({
    name: agent.name,
    description: agent.description || "",
    system_prompt: agent.system_prompt,
    price: formatEther(BigInt(agent.price_per_call)),
    image_url: agent.image_url || "",
    active: agent.active,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(agent.image_url || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setForm({
        name: agent.name,
        description: agent.description || "",
        system_prompt: agent.system_prompt,
        price: formatEther(BigInt(agent.price_per_call)),
        image_url: agent.image_url || "",
        active: agent.active,
      });
      setImagePreview(agent.image_url || null);
      setImageFile(null);
      setError("");
    }
  }, [isOpen, agent]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Preview
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
    setImagePreview(null);
    setForm(prev => ({ ...prev, image_url: "" }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      let finalImageUrl = form.image_url;

      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        formData.append("agentId", agent.id);

        const uploadRes = await fetch("/api/upload-image", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          finalImageUrl = uploadData.imageUrl;
        } else {
          console.error("Failed to upload image");
        }
      }

      const res = await fetch(`/api/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerAddress: agent.owner_address,
          name: form.name,
          description: form.description || null,
          system_prompt: form.system_prompt,
          price_per_call: parseEther(form.price).toString(),
          image_url: finalImageUrl || null,
          active: form.active,
        }),
      });

      const { data, error: apiError } = await res.json();

      if (apiError) {
        setError(apiError);
        return;
      }

      onSave(data);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
          <h2 className="text-lg font-semibold">Edit Agent</h2>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Image Upload */}
          <div>
            <label className="label">Agent Photo</label>
            <div className="mt-2">
              {imagePreview ? (
                <div className="relative w-24 h-24">
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
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-[var(--border-primary)] border-dashed rounded-xl cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors">
                  <div className="flex flex-col items-center justify-center pt-2 pb-3">
                    <Upload className="w-6 h-6 mb-1 text-[var(--text-muted)]" />
                    <p className="text-xs text-[var(--text-muted)]">
                      Click to upload photo
                    </p>
                  </div>
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
            <label className="label">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
              required
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="textarea"
              rows={2}
            />
          </div>

          <div>
            <label className="label">System Prompt</label>
            <textarea
              value={form.system_prompt}
              onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
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

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="active"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="w-4 h-4 rounded border-[var(--border-default)]"
            />
            <label htmlFor="active" className="text-sm">Agent is active and accepting jobs</label>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-default)]">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center gap-2"
              disabled={saving}
            >
              {saving ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
