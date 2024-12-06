import { useCallback } from "react";
import { useReadContract, useWriteContract } from "wagmi";
import { CPAMM_ABI, CPAMM_ADDRESS } from "~~/contracts/cpamm";

export default function useCpamm() {
  const { writeContractAsync } = useWriteContract();
  const { data: liquidity, refetch: refetchLiquidity } = useReadContract({
    address: CPAMM_ADDRESS,
    abi: CPAMM_ABI,
    functionName: "getReserves",
  });

  const refetchAll = useCallback(() => {
    refetchLiquidity();
  }, [refetchLiquidity]);

  return {
    daiPoolLiquidity: liquidity?.[0],
    wbtcPoolLiquidity: liquidity?.[1],
    refetchAll,
    writeContractAsync,
  };
}
