import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "w-4 h-4",
  md: "w-8 h-8",
  lg: "w-12 h-12",
};

export default function LoadingSpinner({ size = "md", className = "" }: LoadingSpinnerProps) {
  return (
    <Loader2 className={`animate-spin text-[var(--text-muted)] ${sizes[size]} ${className}`} />
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <LoadingSpinner size="lg" />
    </div>
  );
}

export function SectionLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <LoadingSpinner size="md" />
    </div>
  );
}
