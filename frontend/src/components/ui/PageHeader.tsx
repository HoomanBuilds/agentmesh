interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export default function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">{title}</h1>
        {description && (
          <p className="text-[var(--text-secondary)]">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
