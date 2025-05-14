import React from "react";
import Image from "next/image";
import { AlertCircle, CheckCircle, InfoIcon, WalletIcon, XCircle } from "lucide-react";
import { Chain, isAddress } from "viem";
import { Card, CardContent, CardHeader, CardTitle } from "~~/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~~/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~~/components/ui/tooltip";
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
  const [isMaxSelected, setIsMaxSelected] = React.useState(false);
  const [hasInsufficientBalance, setHasInsufficientBalance] = React.useState(false);

  const handleMaxClick = () => {
    if (disabled || !balance) return;

    // Create a simulated event to use the same change handler
    const fakeEvent = {
      target: {
        value: formatTokenWithDecimals(balance, token.decimals),
      },
    } as React.ChangeEvent<HTMLInputElement>;

    onAmountChange(fakeEvent);
    setIsMaxSelected(true);
  };

  // Check if the entered amount exceeds the user's balance
  React.useEffect(() => {
    if (displayAmount && displayBalance) {
      try {
        // Convert both to numeric values for comparison
        const amountValue = parseFloat(displayAmount);
        const balanceValue = parseFloat(formatTokenWithDecimals(balance, token.decimals));

        // Set insufficient balance flag
        setHasInsufficientBalance(amountValue > balanceValue);
      } catch (error) {
        // If there's an error in parsing, reset the insufficient balance flag
        setHasInsufficientBalance(false);
      }
    } else {
      setHasInsufficientBalance(false);
    }

    // Reset max selected state when amount changes manually
    if (displayAmount !== formatTokenWithDecimals(balance, token.decimals)) {
      setIsMaxSelected(false);
    }
  }, [displayAmount, balance, token.decimals, displayBalance]);

  return (
    <Card>
      <CardHeader className="p-4 pb-3">
        <CardTitle className="text-muted-foreground text-sm font-normal">
          {isPartyB === false && (
            <div className="flex items-center gap-1">
              <span>You</span>
              <span className="text-xs px-2 py-0.5 bg-secondary/50 rounded-full ml-2">
                {chain.name}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoIcon className="h-3 w-3 ml-1 inline relative -top-px" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Network selected in your wallet</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </span>
            </div>
          )}
          {isPartyB === true && (
            <div className="flex justify-center mb-4 items-center">
              <div className="relative w-full h-full">
                <input
                  placeholder="Enter address here"
                  className={cn(
                    "bg-transparent appearance-none focus:outline-none text-sm w-full pr-8 placeholder:text-red-400 placeholder:font-medium",
                    isAddress(displayPartyB) ? "text-blue-400" : displayPartyB ? "text-red-500" : "text-blue-400",
                    disabled && "opacity-50",
                  )}
                  value={displayPartyB}
                  onChange={onPartyBChange}
                  disabled={disabled}
                  spellCheck={false}
                />
                {displayPartyB && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    {isAddress(displayPartyB) ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <XCircle className="h-4 w-4 text-red-500 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Invalid Ethereum address</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                )}
              </div>
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
          <div className="flex flex-col w-full">
            <input
              placeholder="0"
              className={cn(
                "bg-transparent appearance-none focus:outline-none text-3xl",
                disabled && "opacity-50",
                hasInsufficientBalance && "text-red-500",
              )}
              value={displayAmount}
              onChange={onAmountChange}
              disabled={disabled}
            />

            {displayBalance && (
              <div className="flex items-center gap-x-2 mt-1">
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-x-1 text-sm self-start px-2 py-0.5",
                    isMaxSelected
                      ? "bg-blue-500/20 rounded text-blue-400 font-medium cursor-default"
                      : "text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded cursor-pointer",
                  )}
                  onClick={handleMaxClick}
                  disabled={disabled || isMaxSelected}
                >
                  <WalletIcon className="h-3 w-3" />
                  <span>Max: {formatTokenWithDecimals(balance, token.decimals)}</span>
                </button>

                {hasInsufficientBalance && (
                  <div className="flex items-center gap-x-1 text-sm text-red-500">
                    <AlertCircle className="h-3 w-3" />
                    <span>Insufficient balance</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-y-2">
            <Select value={selectedToken} disabled={disabled} onValueChange={onTokenChange}>
              <SelectTrigger className="bg-secondary text-secondary-foreground shadow hover:bg-secondary/80 text-base h-fit w-max">
                <SelectValue>
                  {selectedToken && (
                    <div className="flex items-center gap-x-2">
                      <Image
                        src={selectedToken === "USDC" ? USDC_TOKEN.logo : TTBILL_TOKEN.logo}
                        alt={selectedToken}
                        width={20}
                        height={20}
                        className="rounded-xl"
                      />
                      <span className="w-max">{selectedToken}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USDC">
                  <div className="flex items-center gap-x-2">
                    <Image
                      src={USDC_TOKEN.logo}
                      alt={USDC_TOKEN.symbol}
                      width={20}
                      height={20}
                      className="rounded-xl"
                    />
                    <span className="truncate">{USDC_TOKEN.symbol}</span>
                  </div>
                </SelectItem>
                <SelectItem value="TTBILL">
                  <div className="flex items-center gap-x-2">
                    <Image
                      src={TTBILL_TOKEN.logo}
                      alt={TTBILL_TOKEN.symbol}
                      width={20}
                      height={20}
                      className="rounded-xl"
                    />
                    <span className="truncate">{TTBILL_TOKEN.symbol}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
