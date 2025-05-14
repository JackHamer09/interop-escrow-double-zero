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

    // Show loading toast that we'll dismiss manually
    const loadingToast = toast.loading("Minting tokens for you. This may take a minute...");

    try {
      // Make a POST request but use query parameters instead of JSON body
      const response = await fetch(
        `${env.NEXT_PUBLIC_INTEROP_BROADCASTER_API}/api/mint-test-funds?address=${address}`,
        {
          method: "POST",
        },
      );

      // Parse the JSON response
      const data = await response.json();

      // Dismiss the loading toast
      toast.dismiss(loadingToast);

      // Check if the request was successful
      if (!response.ok) {
        throw new Error(data.message || "Failed to mint test funds");
      }

      await new Promise(resolve => setTimeout(resolve, 5000)); // Timeout for balances to update

      // Show success toast
      toast.success("Test funds have been minted to your wallet successfully!");

      // Return the success status
      return true;
    } catch (error) {
      console.error("Error minting test funds:", error);
      // Dismiss the loading toast if it's still showing
      toast.dismiss(loadingToast);
      // Show error toast
      toast.error(error instanceof Error ? error.message : "Failed to mint test funds");
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
