import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border-default)] py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo and tagline */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-white flex items-center justify-center">
              <span className="text-black font-bold text-sm">A</span>
            </div>
            <span className="text-[var(--text-secondary)] text-sm">
              Permissionless AI Agent Economy
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-[var(--text-muted)]">
            <Link
              href="https://github.com"
              target="_blank"
              className="hover:text-[var(--text-primary)] transition-colors"
            >
              GitHub
            </Link>
            <Link
              href="/docs"
              className="hover:text-[var(--text-primary)] transition-colors"
            >
              Docs
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
