"use client";

import React from "react";
import Image from "next/image";
import { RefreshBalancesButton } from "./RefreshBalancesButton";
import { useAccount, useChainId } from "wagmi";
import { Card } from "~~/components/ui/card";
import { TTBILL_TOKEN, USDC_TOKEN } from "~~/contracts/tokens";
import { chain1, chain2 } from "~~/services/web3/wagmiConfig";
import { formatTokenWithDecimals } from "~~/utils/currency";

interface TokenBalancesProps {
  usdcBalance: bigint;
  ttbillBalance: bigint;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export const TokenBalances: React.FC<TokenBalancesProps> = ({
  usdcBalance,
  ttbillBalance,
  isRefreshing,
  onRefresh,
}) => {
  const { isConnected } = useAccount();
  const chainId = useChainId();

  if (!isConnected) {
    return null;
  }

  const chainName = chainId === chain1.id ? chain1.name : chainId === chain2.id ? chain2.name : "Unknown Chain";

  return (
    <Card className="w-full max-w-[550px] p-6 mt-14">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium text-xl">My Token Balances</h3>
        <RefreshBalancesButton isLoading={isRefreshing} onRefresh={onRefresh} />
      </div>
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
          <div className="flex items-center gap-x-2">
            <Image src={USDC_TOKEN.logo} alt={USDC_TOKEN.symbol} width={24} height={24} className="rounded-xl" />
            <span className="font-medium">{USDC_TOKEN.symbol}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="font-medium">{formatTokenWithDecimals(usdcBalance ?? 0n, 18)}</span>
            <span className="text-xs text-muted-foreground">on {chainName}</span>
          </div>
        </div>

        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
          <div className="flex items-center gap-x-2">
            <Image src={TTBILL_TOKEN.logo} alt={TTBILL_TOKEN.symbol} width={24} height={24} className="rounded-xl" />
            <span className="font-medium">{TTBILL_TOKEN.symbol}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="font-medium">{formatTokenWithDecimals(ttbillBalance ?? 0n, 18)}</span>
            <span className="text-xs text-muted-foreground">on {chainName}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
