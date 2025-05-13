import React from "react";
import Image from "next/image";
import { Chain, isAddress } from "viem";
import { WalletIcon } from "@heroicons/react/24/outline";
import { Card, CardContent, CardHeader, CardTitle } from "~~/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~~/components/ui/select";
import { TTBILL_TOKEN, Token, USDC_TOKEN } from "~~/contracts/tokens";
import { chain1, chain2 } from "~~/services/web3/wagmiConfig";
import { cn } from "~~/utils/cn";
import { formatTokenWithDecimals } from "~~/utils/currency";

interface PoolCardProps {
  isPartyB: boolean;
  displayPartyB: string;
  balance: bigint;
  displayBalance: boolean;
  displayAmount: string;
  chain: Chain;
  token: Token;
  selectedToken: Token["symbol"];
  onAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPartyBChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onChainChange: (value: number) => void;
  onTokenChange: (value: string) => void;
  disabled: boolean;
}

export const PoolCard: React.FC<PoolCardProps> = ({
  isPartyB,
  displayPartyB,
  balance,
  displayBalance,
  displayAmount,
  chain,
  token,
  selectedToken,
  onAmountChange,
  onPartyBChange,
  onChainChange,
  onTokenChange,
  disabled,
}) => {
  return (
    <Card>
      <CardHeader className="p-4 pb-3">
        <CardTitle className="text-muted-foreground text-sm font-normal">
          {isPartyB === false && "You"}
          {isPartyB === true && (
            <div className="flex justify-center mb-4">
              <input
                placeholder="Enter address here"
                className={cn(
                  "bg-transparent appearance-none focus:outline-none text-sm w-full placeholder-red-300 text-blue-400",
                  !isAddress(displayPartyB) && "text-red-500",
                  disabled && "opacity-50",
                )}
                value={displayPartyB}
                onChange={onPartyBChange}
                disabled={disabled}
                spellCheck={false}
              />
              <Select
                value={chain.id.toString()}
                onValueChange={value => onChainChange(parseInt(value))}
                disabled={disabled}
              >
                <SelectTrigger className="bg-secondary text-secondary-foreground shadow hover:bg-secondary/80 text-base w-48">
                  <SelectValue placeholder="Select Chain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={chain1.id.toString()}>{chain1.name}</SelectItem>
                  <SelectItem value={chain2.id.toString()}>{chain2.name}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-y-2 p-4 pt-0">
        <div className="flex items-center justify-between">
          <input
            placeholder="0"
            className={cn("bg-transparent appearance-none focus:outline-none text-3xl", disabled && "opacity-50")}
            value={displayAmount}
            onChange={onAmountChange}
            disabled={disabled}
          />
          <div className="flex flex-col gap-y-2">
            <Select value={selectedToken} disabled={disabled} onValueChange={onTokenChange}>
              <SelectTrigger className="bg-secondary text-secondary-foreground shadow hover:bg-secondary/80 text-base h-fit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USDC">
                  <div className="flex items-center gap-x-2 mr-2">
                    <Image
                      src={USDC_TOKEN.logo}
                      alt={USDC_TOKEN.symbol}
                      width={20}
                      height={20}
                      className="rounded-xl"
                    />
                    {USDC_TOKEN.symbol}
                  </div>
                </SelectItem>
                <SelectItem value="TTBILL">
                  <div className="flex items-center gap-x-2 mr-2">
                    <Image
                      src={TTBILL_TOKEN.logo}
                      alt={TTBILL_TOKEN.symbol}
                      width={20}
                      height={20}
                      className="rounded-xl"
                    />
                    {TTBILL_TOKEN.symbol}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {displayBalance && (
          <div className="flex items-center gap-x-2 text-sm text-muted-foreground self-end">
            <WalletIcon className="h-4 w-4" />
            {formatTokenWithDecimals(balance, token.decimals)}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
