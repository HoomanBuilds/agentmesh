"use client";

import { useState } from "react";
import { X, ArrowUpRight, Wallet, Loader2 } from "lucide-react";

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  mneeBalance: string;
  ethBalance: string;
  onWithdrawMnee: (amount?: string) => Promise<boolean>;
  onWithdrawEth: (amount?: string) => Promise<boolean>;
  isWithdrawing: boolean;
}

export default function WithdrawModal({
  isOpen,
  onClose,
  mneeBalance,
  ethBalance,
  onWithdrawMnee,
  onWithdrawEth,
  isWithdrawing,
}: WithdrawModalProps) {
  const [selectedToken, setSelectedToken] = useState<"mnee" | "eth">("mnee");
  const [withdrawAll, setWithdrawAll] = useState(true);
  const [customAmount, setCustomAmount] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleWithdraw = async () => {
    setError(null);
    setSuccess(null);

    const amount = withdrawAll ? undefined : customAmount;
    
    if (!withdrawAll && (!customAmount || parseFloat(customAmount) <= 0)) {
      setError("Please enter a valid amount");
      return;
    }

    const balance = selectedToken === "mnee" ? mneeBalance : ethBalance;
    if (!withdrawAll && parseFloat(customAmount) > parseFloat(balance)) {
      setError("Amount exceeds available balance");
      return;
    }

    let result: boolean;
    if (selectedToken === "mnee") {
      result = await onWithdrawMnee(amount);
    } else {
      result = await onWithdrawEth(amount);
    }

    if (result) {
      setSuccess(`Successfully withdrew ${selectedToken.toUpperCase()}!`);
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 2000);
    } else {
      setError("Withdrawal failed. Please try again.");
    }
  };

  const currentBalance = selectedToken === "mnee" ? mneeBalance : ethBalance;
  const hasBalance = parseFloat(currentBalance) > 0;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-primary)] w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-[var(--border-primary)]">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Withdraw Funds
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-5">
            {/* Token Selection */}
            <div>
              <label className="text-sm text-[var(--text-muted)] mb-2 block">Select Token</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedToken("mnee")}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedToken === "mnee"
                      ? "border-yellow-500 bg-yellow-500/10"
                      : "border-[var(--border-primary)] hover:border-[var(--border-secondary)]"
                  }`}
                >
                  <div className="font-semibold">MNEE</div>
                  <div className="text-sm text-[var(--text-muted)]">
                    {parseFloat(mneeBalance).toFixed(4)}
                  </div>
                </button>
                <button
                  onClick={() => setSelectedToken("eth")}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedToken === "eth"
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-[var(--border-primary)] hover:border-[var(--border-secondary)]"
                  }`}
                >
                  <div className="font-semibold">ETH</div>
                  <div className="text-sm text-[var(--text-muted)]">
                    {parseFloat(ethBalance).toFixed(6)}
                  </div>
                </button>
              </div>
            </div>

            {/* Amount Selection */}
            <div>
              <label className="text-sm text-[var(--text-muted)] mb-2 block">Amount</label>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-tertiary)] cursor-pointer">
                  <input
                    type="radio"
                    checked={withdrawAll}
                    onChange={() => setWithdrawAll(true)}
                    className="w-4 h-4 accent-yellow-500"
                  />
                  <span>Withdraw All ({parseFloat(currentBalance).toFixed(selectedToken === "mnee" ? 4 : 6)} {selectedToken.toUpperCase()})</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-tertiary)] cursor-pointer">
                  <input
                    type="radio"
                    checked={!withdrawAll}
                    onChange={() => setWithdrawAll(false)}
                    className="w-4 h-4 accent-yellow-500"
                  />
                  <span>Custom Amount</span>
                </label>
                {!withdrawAll && (
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder={`Enter ${selectedToken.toUpperCase()} amount`}
                    step={selectedToken === "mnee" ? "0.0001" : "0.000001"}
                    className="w-full px-4 py-3 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-primary)] focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                  />
                )}
              </div>
            </div>

            {/* Success/Error Messages */}
            {success && (
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
                {success}
              </div>
            )}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-[var(--border-primary)] flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-[var(--bg-tertiary)] rounded-xl font-medium hover:bg-[var(--bg-surface)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleWithdraw}
              disabled={isWithdrawing || !hasBalance}
              className="flex-1 px-4 py-3 bg-white text-black rounded-xl font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isWithdrawing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Withdrawing...
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-4 h-4" />
                  Withdraw
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
