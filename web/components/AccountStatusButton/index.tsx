"use client";

import { useEffect, useState } from "react";
import { Balance } from "../Balance";
import { AddressInfoDropdown } from "./AddressInfoDropdown";
import { Address } from "viem";
import { useAccount } from "wagmi";
import { chain1, chain2 } from "~~/services/web3/wagmiConfig";

/**
 * Account Status Button - Shows account information when connected
 */
export const AccountStatusButton = () => {
  const { address, isConnected, chainId } = useAccount();
  const [mounted, setMounted] = useState(false);

  // Ensure we're mounted to prevent hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const connected = mounted && isConnected && address;
  const isUnsupportedChain = chainId && ![chain1.id, chain2.id].includes(chainId);

  // If not connected, show nothing
  if (!connected) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {!isUnsupportedChain && (
        <div className="flex flex-col items-center mr-2">
          <Balance address={address as Address} className="min-h-0 h-auto" />
          <span className="text-xs">{chainId === chain1.id ? chain1.name : chain2.name}</span>
        </div>
      )}
      <AddressInfoDropdown address={address as Address} />
    </div>
  );
};
