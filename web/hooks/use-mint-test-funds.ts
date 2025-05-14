"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { env } from "~~/utils/env";

export default function useMintTestFunds() {
  const { address } = useAccount();
  const [isMinting, setIsMinting] = useState(false);

  const mintTestFunds = async (): Promise<boolean> => {
    if (!address) {
      toast.error("Wallet not connected");
      return false;
    }

    setIsMinting(true);

    try {
      // Complete minting process with a single toast.promise
      await toast.promise(
        (async () => {
          const response = await fetch(
            `${env.NEXT_PUBLIC_INTEROP_BROADCASTER_API}/api/mint-test-funds?address=${address}`,
            {
              method: "POST",
            },
          );

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || "Failed to mint test funds");
          }

          // Wait for balances to update
          await new Promise(resolve => setTimeout(resolve, 5000));

          return true;
        })(),
        {
          loading: "Minting tokens for you. This may take a minute...",
          success: "Test funds have been minted to your wallet successfully!",
          error: err => (err instanceof Error ? err.message : "Failed to mint test funds"),
        },
      );

      return true;
    } catch (error) {
      console.error("Error minting test funds:", error);
      return false;
    } finally {
      setIsMinting(false);
    }
  };

  return {
    mintTestFunds,
    isMinting,
  };
}
