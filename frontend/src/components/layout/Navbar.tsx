"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { ChevronDown } from "lucide-react";
import { useMyMneeBalance, useMintMnee } from "@/hooks";
import { LoadingSpinner } from "@/components/ui";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/agents", label: "Browse" },
  { href: "/create", label: "Create" },
  { href: "/dashboard", label: "Dashboard" },
];

function MneeBalance() {
  const { isConnected } = useAccount();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { formatted, refetch } = useMyMneeBalance();
  const { mint, isPending, isSuccess } = useMintMnee();

  useEffect(() => {
    if (isSuccess) {
      refetch();
      setDropdownOpen(false);
    }
  }, [isSuccess, refetch]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isConnected) return null;

  const formattedBalance = parseFloat(formatted).toFixed(2);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] hover:border-[var(--border-hover)] transition-colors text-sm"
      >
        <span className="font-medium">{formattedBalance}</span>
        <span className="text-[var(--text-muted)]">MNEE</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg shadow-lg overflow-hidden z-50">
          <div className="p-3 border-b border-[var(--border-default)]">
            <div className="text-xs text-[var(--text-muted)] mb-1">Your Balance</div>
            <div className="font-semibold">{formattedBalance} MNEE</div>
          </div>
          <div className="p-2">
            <button
              onClick={() => mint("10")}
              disabled={isPending}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--border-default)] transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <LoadingSpinner size="sm" />
                  Minting...
                </>
              ) : (
                "Get 10 MNEE (Testnet)"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border-default)] bg-[var(--bg-primary)]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <span className="text-black font-bold text-lg">A</span>
            </div>
            <span className="font-semibold text-lg hidden sm:block">
              AgentPay
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* MNEE Balance + Wallet Connect */}
          <div className="flex items-center gap-3">
            <MneeBalance />
            <ConnectButton.Custom>
              {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                mounted,
              }) => {
                const ready = mounted;
                const connected = ready && account && chain;

                return (
                  <div
                    {...(!ready && {
                      "aria-hidden": true,
                      style: {
                        opacity: 0,
                        pointerEvents: "none",
                        userSelect: "none",
                      },
                    })}
                  >
                    {(() => {
                      if (!connected) {
                        return (
                          <button
                            onClick={openConnectModal}
                            className="btn-primary text-sm"
                          >
                            Connect
                          </button>
                        );
                      }

                      if (chain.unsupported) {
                        return (
                          <button
                            onClick={openChainModal}
                            className="btn-secondary text-sm text-red-400 border-red-400/50"
                          >
                            Wrong Network
                          </button>
                        );
                      }

                      return (
                        <button
                          onClick={openAccountModal}
                          className="btn-secondary text-sm"
                        >
                          {account.displayName}
                        </button>
                      );
                    })()}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>
        </div>
      </div>
    </nav>
  );
}
