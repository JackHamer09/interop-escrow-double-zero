"use client";

import { useEffect, useState } from "react";
import useTradeEscrow from "./use-trade-escrow";
import { useAccount } from "wagmi";
import { chain1, chain2 } from "~~/services/web3/wagmiConfig";

export function useConnectionStatus() {
  const account = useAccount();
  const { successfullyReceivedSwaps, refetchMySwaps } = useTradeEscrow();
  const [isAbleToRequestWalletChain, setIsAbleToRequestWalletChain] = useState<boolean>(false);

  // Check if current chain is supported (either chain1 or chain2)
  const isSupportedChainSelected = account.chainId ? [chain1.id, chain2.id].includes(account.chainId) : false;

  // Check if ethereum.request works for eth_getBalance
  useEffect(() => {
    if (!account.isConnected) {
      setIsAbleToRequestWalletChain(false);
      return;
    }

    const checkWalletConnection = async () => {
      try {
        await window.ethereum.request({
          method: "eth_getBalance",
          params: [account.address, "latest"],
        });
        setIsAbleToRequestWalletChain(true);
      } catch (error) {
        console.warn("Failed to request wallet chain:", error);
        setIsAbleToRequestWalletChain(false);
      }
    };

    const intervalId = setInterval(() => void checkWalletConnection(), 500);

    // Initial check
    checkWalletConnection();

    return () => {
      clearInterval(intervalId);
    };
  }, [account.isConnected, account.address]);

  useEffect(() => {
    const interval = setInterval(() => void refetchMySwaps(), 500);

    return () => {
      clearInterval(interval);
    };
  }, [refetchMySwaps]);

  return {
    isWalletConnected: account.isConnected,
    isAbleToRequestWalletChain,
    hasChain1RpcConnection: successfullyReceivedSwaps,
    isSupportedChainSelected,
  };
}
