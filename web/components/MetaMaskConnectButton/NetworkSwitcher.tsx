"use client";

import { useMemo } from "react";
import { Button } from "../ui/button";
import { useSwitchChain } from "wagmi";
import { chain1, chain2 } from "~~/services/web3/wagmiConfig";

interface NetworkSwitcherProps {
  currentChainId?: number;
}

export const NetworkSwitcher = ({ currentChainId }: NetworkSwitcherProps) => {
  const { switchChain } = useSwitchChain();

  const targetChain = useMemo(() => {
    if (!currentChainId) return chain1;
    return currentChainId === chain1.id ? chain2 : chain1;
  }, [currentChainId]);

  const handleSwitchNetwork = async () => {
    try {
      await switchChain({ chainId: targetChain.id });
    } catch (error) {
      console.error("Failed to switch network:", error);
    }
  };

  return (
    <Button variant="outline" className="text-xs px-2 py-1 h-auto" onClick={handleSwitchNetwork}>
      Switch to {targetChain.name}
    </Button>
  );
};
