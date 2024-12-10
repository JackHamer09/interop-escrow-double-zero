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

  const refetchAll = useCallback(() => {
    refetchLiquidity();
  }, [refetchLiquidity]);

  const addLiquidityAllowed = useMemo(() => {
    if (simulateAddLiquidityError === null) {
      return true;
    }
    return !simulateAddLiquidityError.message.includes("Internal JSON-RPC error.");
  }, [simulateAddLiquidityError]);

  return {
    daiPoolLiquidity: liquidity?.[0],
    wbtcPoolLiquidity: liquidity?.[1],
    refetchAll,
    writeContractAsync,
    userShares,
    addLiquidityAllowed,
  };
}
