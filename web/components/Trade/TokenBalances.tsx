"use client";

import React from "react";
import Image from "next/image";
import { RefreshBalancesButton } from "./RefreshBalancesButton";
import { formatUnits } from "viem";
import { useChainId } from "wagmi";
import { Card } from "~~/components/ui/card";
import { getChainById } from "~~/config/chains-config";
import { TokenWithBalance } from "~~/hooks/use-balances";

interface TokenBalancesProps {
  tokens: TokenWithBalance[];
  isRefreshing: boolean;
  onRefresh: () => void;
}

export const TokenBalances: React.FC<TokenBalancesProps> = ({ tokens, isRefreshing, onRefresh }) => {
  const chainId = useChainId();

  if (!tokens.length) return null;

  const chain = getChainById(chainId);
  if (!chain) return null;

  return (
    <Card className="w-full max-w-[550px] p-6 mt-14">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium text-xl">My Token Balances</h3>
        <RefreshBalancesButton isLoading={isRefreshing} onRefresh={onRefresh} />
      </div>
      <div className="flex flex-col space-y-4">
        {tokens.map(token => (
          <div key={token.symbol} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
            <div className="flex items-center gap-x-2">
              <Image src={token.logo} alt={token.symbol} width={24} height={24} className="rounded-xl" />
              <span className="font-medium">{token.symbol}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-medium">{formatUnits(token.balance || 0n, token.decimals)}</span>
              <span className="text-xs text-muted-foreground">on {chain.name}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
