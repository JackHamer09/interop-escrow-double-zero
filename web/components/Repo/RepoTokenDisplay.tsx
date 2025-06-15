import React from "react";
import Image from "next/image";
import { ShortAddress } from "../Trade/ShortAddress";
import { Address, formatUnits } from "viem";
import { TokenConfig } from "~~/config/tokens-config";

interface RepoTokenDisplayProps {
  token: TokenConfig;
  amount: bigint;
  party: Address | null;
  myAddress?: Address;
  isRight?: boolean;
  chainName?: string;
  label: string;
}

export const RepoTokenDisplay: React.FC<RepoTokenDisplayProps> = ({
  token,
  amount,
  party,
  myAddress,
  isRight = false,
  chainName,
  label,
}) => {
  return (
    <div className="flex flex-col gap-1">
      <span className={`text-xs text-muted-foreground font-medium ${isRight ? "text-right" : ""}`}>{label}</span>
      <div className={`flex items-center gap-x-2 ${isRight ? "justify-end" : ""} ${isRight ? "" : "mr-2"}`}>
        <Image src={token.logo} alt={token.symbol} width={20} height={20} className="rounded-xl" />
        <span>{formatUnits(amount, token.decimals)}</span>
        <span>{token.symbol}</span>
      </div>
      {party && myAddress === party && (
        <span className={`text-sm text-muted-foreground ${isRight ? "text-right" : ""}`}>You</span>
      )}
      {party && myAddress !== party && <ShortAddress address={party} isRight={isRight} />}
      {!party && (
        <span className={`text-sm text-muted-foreground ${isRight ? "text-right" : ""}`}>Open to anyone</span>
      )}
      {chainName && (
        <span className={`text-xs text-muted-foreground ${isRight ? "text-right" : ""}`}>on {chainName}</span>
      )}
    </div>
  );
};