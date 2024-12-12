import { useCallback, useMemo } from "react";
import { useAccount, useReadContract, useSimulateContract, useWriteContract } from "wagmi";
import { CPAMM_ABI, CPAMM_ADDRESS } from "~~/contracts/cpamm";

const options = {
  address: CPAMM_ADDRESS,
  abi: CPAMM_ABI,
} as const;

export default function useCpamm() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { data: liquidity, refetch: refetchLiquidity } = useReadContract({
    ...options,
    functionName: "getReserves",
  });
  const { data: userShares } = useReadContract({
    ...options,
    functionName: "balanceOf",
    args: [address ?? ""],
  });
  const { error: simulateAddLiquidityError } = useSimulateContract({
    ...options,
    functionName: "addLiquidity",
    args: [1n, 1n],
    query: {
      retry: 1,
    },
  });
  const { data: fee, refetch: refetchFee } = useReadContract({
    ...options,
    functionName: "getUserFee",
    args: [address ?? ""],
  });
  const { data: remainingDailyAllowance, refetch: refetchRemainingDailyAllowance } = useReadContract({
    ...options,
    functionName: "getRemainingDailyAllowance",
    args: [address ?? ""],
  });

  const refetchAll = useCallback(() => {
    refetchLiquidity();
    refetchFee();
    refetchRemainingDailyAllowance();
  }, [refetchLiquidity, refetchFee, refetchRemainingDailyAllowance]);

  const addLiquidityAllowed = useMemo(() => {
    // Get the last known state from localStorage, default to true if not set
    const lastKnownState = localStorage.getItem("addLiquidityAllowed") === "false" ? false : true;

    if (simulateAddLiquidityError === null) {
      return lastKnownState;
    }

    const currentState = !simulateAddLiquidityError.message.includes("Internal JSON-RPC error.");
    // Store the new state
    localStorage.setItem("addLiquidityAllowed", currentState.toString());
    return currentState;
  }, [simulateAddLiquidityError]);

  return {
    daiPoolLiquidity: liquidity?.[0],
    wbtcPoolLiquidity: liquidity?.[1],
    refetchAll,
    writeContractAsync,
    userShares,
    addLiquidityAllowed,
    fee,
    remainingDailyAllowance,
  };
}
