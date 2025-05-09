"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect } from "wagmi";
import { Address } from "viem";
import { Balance } from "../Balance";
import { Button } from "../ui/button";
import { WrongNetworkDropdown } from "./WrongNetworkDropdown";
import { AddressInfoDropdown } from "./AddressInfoDropdown";
import { chain1, chain2 } from "~~/services/web3/wagmiConfig";

/**
 * Custom MetaMask Connect Button
 */
export const MetaMaskConnectButton = () => {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const [mounted, setMounted] = useState(false);

  // Ensure we're mounted to prevent hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const metaMaskConnector = connectors[0];
  const connected = mounted && isConnected && address;
  const isUnsupportedChain = chainId && ![chain1.id, chain2.id].includes(chainId);

  if (!connected) {
    return (
      <Button 
        className="min-h-[42px] h-[42px]" 
        onClick={() => connect({ connector: metaMaskConnector })} 
        type="button"
      >
        Connect Wallet
      </Button>
    );
  }

  if (isUnsupportedChain) {
    return <WrongNetworkDropdown />;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-center mr-2">
        <Balance address={address as Address} className="min-h-0 h-auto" />
        <span className="text-xs">{chainId === chain1.id ? chain1.name : chain2.name}</span>
      </div>
      <AddressInfoDropdown address={address as Address} />
    </div>
  );
};