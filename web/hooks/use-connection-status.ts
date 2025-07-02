"use client";

import { useEffect, useMemo } from "react";
import { useRpcLogin } from "./use-rpc-login";
import useTradeEscrow from "./use-trade-escrow";
import { useAccount, useBalance } from "wagmi";
import { allChains } from "~~/config/chains-config";

export function useConnectionStatus() {
  const account = useAccount();
  const { successfullyReceivedSwaps, refetchMySwaps } = useTradeEscrow();
  const rpcLoginResult = useRpcLogin();
  const { isChainAAuthenticated, isChainCAuthenticated } = rpcLoginResult;
  
  console.log('useConnectionStatus hook called, isChainCAuthenticated:', isChainCAuthenticated);

  // Check if current wallet chain is supported
  const isSupportedWalletChainSelected = useMemo(() => {
    return allChains.map(e => e.id).includes(account.chainId as any);
  }, [account.chainId]);

  const { isSuccess: successfullyReceivedBalance, refetch: refetchWalletChainBalances } = useBalance({
    address: account.address,
    chainId: account.chainId,
    query: {
      // enabled: true,
      gcTime: 500,
      refetchInterval: 500,
      refetchIntervalInBackground: true,
    },
  });

  useEffect(() => {
    const interval = setInterval(() => {
      refetchMySwaps();
      refetchWalletChainBalances();
    }, 500);

    return () => {
      clearInterval(interval);
    };
  }, [refetchMySwaps, refetchWalletChainBalances]);

  console.log('useConnectionStatus - isChainCAuthenticated:', isChainCAuthenticated);
  
  return {
    isWalletConnected: account.isConnected,
    isSupportedWalletChainSelected: account.isConnected && isSupportedWalletChainSelected,
    isAbleToRequestWalletChain: account.isConnected && successfullyReceivedBalance,
    hasChainARpcConnection: isChainAAuthenticated || successfullyReceivedSwaps,
    hasChainCRpcConnection: isChainCAuthenticated,
  };
}
