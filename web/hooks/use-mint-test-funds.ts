"use client";

import { useState } from "react";
import { Address } from "abitype";
import toast from "react-hot-toast";
import { parseUnits } from "viem";
import { useAccount, useWriteContract } from "wagmi";
import { env } from "~~/utils/env";
import waitForTransactionReceipt from "~~/utils/wait-for-transaction";

export default function useMintTestFunds() {
  const { address } = useAccount();
  const [isMinting, setIsMinting] = useState(false);
  const { writeContractAsync } = useWriteContract();

  const mintToken = async (tokenAddress: string, amount: bigint) => {
    const hash = await writeContractAsync({
      address: tokenAddress as Address,
      abi: [
        {
          name: "mint",
          type: "function",
          inputs: [
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" },
          ],
          outputs: [],
        },
      ],
      functionName: "mint",
      args: [address, amount],
    });
    await waitForTransactionReceipt({ hash: hash });
  };

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
          await mintToken(env.NEXT_PUBLIC_USDC_ADDRESS, parseUnits("100", 18));
          await mintToken(env.NEXT_PUBLIC_TTBILL_ADDRESS, parseUnits("100", 18));

          // Wait for balances to update
          await new Promise(resolve => setTimeout(resolve, 5000));

          return true;
        })(),
        {
          loading: "Minting tokens for you. Confirm mint transactions in your wallet...",
          success: "Test funds have been minted to your wallet successfully!",
          error: err =>
            err instanceof Error && !err.message.includes("User rejected the request")
              ? err.message
              : "Failed to mint test funds",
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
