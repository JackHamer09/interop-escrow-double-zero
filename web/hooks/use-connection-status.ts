import { useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { DAI_TOKEN, ERC20_ABI } from "~~/contracts/tokens";

export function useConnectionStatus() {
  const coso = useAccount();
  const { isConnected, address: walletAddress } = coso;

  const { isSuccess, refetch } = useReadContract({
    address: DAI_TOKEN.address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [walletAddress ?? ""],
    query: {
      retry: false,
    },
  });

  useEffect(() => {
    const interval = setInterval(() => void refetch().catch(() => null), 3000);
    return () => {
      clearInterval(interval);
    };
  }, [refetch]);

  return {
    isConnected,
    walletAndRpcMatch: isSuccess,
  };
}
