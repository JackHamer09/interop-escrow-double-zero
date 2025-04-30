import { useEffect } from "react";
import useTradeEscrow from "./use-trade-escrow";
import { useAccount } from "wagmi";
import { chain1, chain2 } from "~~/services/web3/wagmiConfig";

export function useConnectionStatus() {
  const account = useAccount();
  const { successfullyReceivedSwaps, refetchMySwaps } = useTradeEscrow();

  useEffect(() => {
    const interval = setInterval(() => void refetchMySwaps().catch(() => null), 3000);
    return () => {
      clearInterval(interval);
    };
  }, [refetchMySwaps]);

  return {
    isConnected: account.isConnected,
    canSuccessfullyRequestThroughWallet: successfullyReceivedSwaps,
    walletAndRpcMatch: account.chainId && [chain1.id, chain2.id].includes(account.chainId),
  };
}
