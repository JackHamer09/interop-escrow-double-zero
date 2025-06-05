import React from "react";
import Image from "next/image";
import { ShortAddress } from "./ShortAddress";
import { Address, formatUnits } from "viem";
import { TokenConfig } from "~~/config/tokens-config";

interface TokenDisplayProps {
  token: TokenConfig;
  amount: bigint;
  party: Address;
  myAddress?: Address;
  isRight?: boolean;
  chainName?: string;
}

export const TokenDisplay: React.FC<TokenDisplayProps> = ({
  token,
  amount,
  party,
  myAddress,
  isRight = false,
  chainName,
}) => {
  return (
    <div className="flex flex-col gap-1">
      <div className={`flex items-center gap-x-2 ${isRight ? "justify-end" : ""} ${isRight ? "" : "mr-2"}`}>
        <Image src={token.logo} alt={token.symbol} width={20} height={20} className="rounded-xl" />
        <span>{formatUnits(amount, token.decimals)}</span>
        <span>{token.symbol}</span>
      </div>
      {myAddress === party && (
        <span className={`text-sm text-muted-foreground ${isRight ? "text-right" : ""}`}>You</span>
      )}
      {myAddress !== party && <ShortAddress address={party} isRight={isRight} />}
      {chainName && (
        <span className={`text-xs text-muted-foreground ${isRight ? "text-right" : ""}`}>on {chainName}</span>
      )}
    </div>
  );
};
