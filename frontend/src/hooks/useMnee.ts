"use client";

import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from "wagmi";
import { parseEther, formatEther } from "viem";
import { MNEE_ADDRESS } from "@/lib/contracts";
import MockMNEEJSON from "@/constants/MockMNEE.json";
import { useEffect, useCallback } from "react";

const MockMNEEABI = MockMNEEJSON.abi;

/**
 * Get MNEE balance for an address
 */
export function useMneeBalance(address?: `0x${string}`) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: MNEE_ADDRESS,
    abi: MockMNEEABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  return {
    balance: data as bigint | undefined,
    formatted: data ? formatEther(data as bigint) : "0",
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to mint testnet MNEE tokens
 */
export function useMintMnee() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isSuccess, isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const mint = useCallback((amount: string = "10") => {
    if (!address) return;
    
    writeContract({
      address: MNEE_ADDRESS,
      abi: MockMNEEABI,
      functionName: "mint",
      args: [address, parseEther(amount)],
    });
  }, [address, writeContract]);

  return {
    mint,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Hook to get current user's MNEE balance with auto-refresh
 */
export function useMyMneeBalance() {
  const { address } = useAccount();
  return useMneeBalance(address);
}
