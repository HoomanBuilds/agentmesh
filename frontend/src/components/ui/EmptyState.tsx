import { Bot } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="card p-12 text-center">
      <div className="mx-auto mb-4 text-[var(--text-muted)]">
        {icon || <Bot className="w-12 h-12 mx-auto" />}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-[var(--text-secondary)] mb-6">{description}</p>
      {action && (
        <Link href={action.href} className="btn-primary inline-block">
          {action.label}
        </Link>
      )}
    </div>
  );
}
