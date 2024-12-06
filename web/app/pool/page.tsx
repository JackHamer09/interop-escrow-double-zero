"use client";

import React, { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { PlusIcon } from "@heroicons/react/24/solid";
import { Button } from "~~/components/ui/button";
import { Card } from "~~/components/ui/card";
import { CPAMM_ADDRESS } from "~~/contracts/cpamm";
import { CPAMM_ABI } from "~~/contracts/cpamm";
import useCpamm from "~~/hooks/use-cpamm";
import { formatTokenWithDecimals } from "~~/utils/currency";
import waitForTransactionReceipt from "~~/utils/wait-for-transaction";

export default function AddLiquidity() {
  const { userShares, writeContractAsync } = useCpamm();
  const [removingLiquidity, setRemovingLiquidity] = useState(false);

  const formattedShares = formatTokenWithDecimals(userShares ?? 0n, 18);

  const handleRemoveLiquidity = async () => {
    if (!userShares) return;

    setRemovingLiquidity(true);
    const tx = await toast.promise(
      writeContractAsync({
        address: CPAMM_ADDRESS,
        abi: CPAMM_ABI,
        functionName: "removeLiquidity",
        args: [userShares ?? 0n],
      }),
      {
        success: "Liquidity removed successfully",
        loading: "Removing liquidity...",
        error: err => {
          console.error(err);
          return "Failed to remove liquidity";
        },
      },
    );
    await toast.promise(waitForTransactionReceipt({ hash: tx }), {
      success: "Liquidity removed successfully",
      loading: "Waiting for confirmation...",
      error: err => {
        console.error(err);
        return "Failed to remove liquidity";
      },
    });
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative">
      <div className="flex flex-col min-w-[500px]">
        <h2 className="card-title mb-4 font-medium text-2xl">My Positions</h2>
        <Link href="/pool/add">
          <Button>
            <PlusIcon className="h-4 w-4" />
            Add Liquidity
          </Button>
        </Link>
        <Card className="p-6 flex items-center justify-center mt-6 h-[200px]">
          {userShares ? (
            <p className="text-3xl font-medium">
              {formattedShares} share{formattedShares === "1" ? "" : "s"}
            </p>
          ) : (
            <p className="text-muted-foreground">No positions found</p>
          )}
        </Card>
        <Button
          className="mt-6 h-11"
          variant="secondary"
          disabled={!userShares || removingLiquidity}
          onClick={handleRemoveLiquidity}
        >
          Remove Liquidity
        </Button>
      </div>
    </div>
  );
}
