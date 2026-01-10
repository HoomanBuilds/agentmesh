"use client";

import { Upload } from "lucide-react";

interface AgentPreviewCardProps {
  imagePreview: string | null;
  name: string;
  price: string;
}

export function AgentPreviewCard({ 
  imagePreview, 
  name, 
  price 
}: AgentPreviewCardProps) {
  return (
    <div className="lg:sticky lg:top-24 h-fit">
      <div className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)] mb-3">
        Preview
      </div>
      <div className="card p-4 space-y-4">
        {/* Image Preview */}
        <div className="aspect-square rounded-xl overflow-hidden bg-[var(--bg-tertiary)] border border-[var(--border-primary)]">
          {imagePreview ? (
            <img 
              src={imagePreview} 
              alt="Agent preview" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <Upload className="w-8 h-8 mx-auto mb-2 text-[var(--text-muted)]" />
                <p className="text-xs text-[var(--text-muted)]">Upload image</p>
              </div>
            </div>
          )}
        </div>

        {/* Name */}
        <div>
          <h3 className="font-bold text-lg truncate">
            {name || "Agent Name"}
          </h3>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border-primary)]">
          <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
            Price
          </span>
          <span className="font-mono font-bold">
            {price || "0.00"} MNEE
          </span>
        </div>
      </div>
    </div>
  );
}
