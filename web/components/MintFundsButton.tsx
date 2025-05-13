"use client";

import { Button } from "~~/components/ui/button";
import useMintTestFunds from "~~/hooks/use-mint-test-funds";
import { GiftIcon } from "lucide-react";
import { useAccount, useChainId } from "wagmi";
import { chain1 } from "~~/services/web3/wagmiConfig";

interface MintFundsButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  onMintSuccess?: () => void;
}

export default function MintFundsButton({
  variant = "outline",
  size = "default",
  className = "",
  onMintSuccess,
}: MintFundsButtonProps) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { isMinting, mintTestFunds } = useMintTestFunds();

  const handleMint = async () => {
    const success = await mintTestFunds();
    if (success && onMintSuccess) {
      onMintSuccess();
    }
  };

  // Only show on Chain A (chain1)
  if (!isConnected || chainId !== chain1.id) {
    return null;
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleMint}
      loading={isMinting}
      disabled={isMinting}
    >
      {!isMinting && <GiftIcon className="w-4 h-4" />}
      Get Test Tokens
    </Button>
  );
}