"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface RatingStarsProps {
  agentId: string;
  jobId: string;
  userAddress: string;
  agentName: string;
  onRated?: () => void;
}

export default function RatingStars({
  agentId,
  jobId,
  userAddress,
  agentName,
  onRated,
}: RatingStarsProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (rating === 0) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/agents/${agentId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          userAddress,
          rating,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit rating");
      }

      setIsSubmitted(true);
      onRated?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mt-3 pt-3 border-t border-[var(--border-primary)]">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-4 h-4 ${
                star <= rating
                  ? "text-yellow-400 fill-yellow-400"
                  : "text-[var(--text-muted)]"
              }`}
            />
          ))}
        </div>
        <span>Thanks for rating {agentName}!</span>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-[var(--border-primary)]">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)]">Rate this consultation:</span>
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-0.5 transition-transform hover:scale-110"
                disabled={isSubmitting}
              >
                <Star
                  className={`w-5 h-5 transition-colors ${
                    star <= (hoveredRating || rating)
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-[var(--text-muted)]"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
        
        {rating > 0 && (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="text-xs px-3 py-1.5 bg-yellow-500 text-black rounded font-semibold hover:bg-yellow-400 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Submit Rating"}
          </button>
        )}
      </div>
      
      {error && (
        <p className="text-xs text-red-400 mt-1">{error}</p>
      )}
    </div>
  );
}
