"use client";

import { Button } from "./ui/button";
import { useConnect } from "wagmi";

/**
 * Standalone Connect Wallet Button component
 */
export const ConnectWalletButton = () => {
  const { connect, connectors } = useConnect();
  const metaMaskConnector = connectors[0];

  return (
    <Button
      className="min-h-[42px] h-[42px] w-full"
      onClick={() => connect({ connector: metaMaskConnector })}
      type="button"
    >
      Connect Wallet
    </Button>
  );
};
