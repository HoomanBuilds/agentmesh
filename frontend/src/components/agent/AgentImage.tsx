"use client";

import { Bot } from "lucide-react";

interface AgentImageProps {
  imageUrl?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-10 h-10",
  md: "w-16 h-16",
  lg: "w-24 h-24",
};

const iconSizes = {
  sm: "w-5 h-5",
  md: "w-8 h-8",
  lg: "w-12 h-12",
};

export default function AgentImage({ 
  imageUrl, 
  name, 
  size = "md",
  className = "" 
}: AgentImageProps) {
  return (
    <div 
      className={`rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center flex-shrink-0 overflow-hidden ${sizeClasses[size]} ${className}`}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover"
        />
      ) : (
        <Bot className={`${iconSizes[size]} text-[var(--text-muted)]`} />
      )}
    </div>
  );
}
