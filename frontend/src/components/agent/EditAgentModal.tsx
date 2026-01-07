"use client";

import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { Agent } from "@/types";
import { LoadingSpinner } from "@/components/ui";
import { formatEther, parseEther } from "viem";

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
      setError("");
    }
  }, [isOpen, agent]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          system_prompt: form.system_prompt,
          price_per_call: parseEther(form.price).toString(),
          image_url: form.image_url || null,
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

          <div>
            <label className="label">Image URL (optional)</label>
            <input
              type="url"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="https://example.com/image.png"
              className="input"
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
