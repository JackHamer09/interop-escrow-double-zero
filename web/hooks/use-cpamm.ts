import { useCallback } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { CPAMM_ABI, CPAMM_ADDRESS } from "~~/contracts/cpamm";

export default function useCpamm() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const {
    data: liquidity,
    refetch: refetchLiquidity,
    error,
  } = useReadContract({
    address: CPAMM_ADDRESS,
    abi: CPAMM_ABI,
    functionName: "getReserves",
  });
  const { data: userShares } = useReadContract({
    address: CPAMM_ADDRESS,
    abi: CPAMM_ABI,
    functionName: "balanceOf",
    args: [address ?? ""],
  });
  if (error) {
    console.error("error", error);
  }

  const refetchAll = useCallback(() => {
    refetchLiquidity();
  }, [refetchLiquidity]);

  return {
    daiPoolLiquidity: liquidity?.[0],
    wbtcPoolLiquidity: liquidity?.[1],
    refetchAll,
    writeContractAsync,
    userShares,
  };
}
