import { useCallback, useEffect, useMemo } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
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
  const { data: allowedToAddLiquidity, refetch: refetchAllowedToAddLiquidity } = useReadContract({
    ...options,
    functionName: "allowedToAddLiquidity",
    account: address ?? "",
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
    refetchAllowedToAddLiquidity();
  }, [refetchLiquidity, refetchFee, refetchRemainingDailyAllowance, refetchAllowedToAddLiquidity]);

  // Refetch all when the address changes
  useEffect(() => {
    refetchAll();
  }, [address, refetchAll]);

  const addLiquidityAllowed = useMemo(() => {
    // Get the last known state from localStorage, default to true if not set
    const lastKnownState = globalThis?.localStorage?.getItem("addLiquidityAllowed") === "false" ? false : true;

    // If the simulateAddLiquidityError is loading, then we are on the first render
    if (allowedToAddLiquidity === undefined) {
      return lastKnownState;
    }

    globalThis?.localStorage?.setItem("addLiquidityAllowed", allowedToAddLiquidity.toString());
    return allowedToAddLiquidity;
  }, [allowedToAddLiquidity]);

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
