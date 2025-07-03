import React from "react";
import Image from "next/image";
import { AlertCircle, WalletIcon } from "lucide-react";
import { Chain, Hash, formatUnits } from "viem";
import { Card, CardContent, CardHeader, CardTitle } from "~~/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~~/components/ui/select";
import { repoSupportedTokens } from "~~/config/repo-config";
import { TokenConfig } from "~~/config/tokens-config";
import { cn } from "~~/utils/cn";

interface RepoPoolCardProps {
  isLending: boolean;
  balance: bigint;
  displayBalance: boolean;
  displayAmount: string;
  chain: Chain;
  token: TokenConfig;
  onAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTokenChange: (tokenAssetId: Hash) => void;
  disabled: boolean;
  label: string;
}

export const RepoPoolCard: React.FC<RepoPoolCardProps> = ({
  isLending,
  balance,
  displayBalance,
  displayAmount,
  chain,
  token,
  onAmountChange,
  onTokenChange,
  disabled,
  label,
}) => {
  const [isMaxSelected, setIsMaxSelected] = React.useState(false);
  const [hasInsufficientBalance, setHasInsufficientBalance] = React.useState(false);

  const handleMaxClick = () => {
    if (disabled || !balance) return;

    // Create a simulated event to use the same change handler
    const fakeEvent = {
      target: {
        value: formatUnits(balance, token.decimals),
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
        const balanceValue = parseFloat(formatUnits(balance, token.decimals));

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
    if (displayAmount !== formatUnits(balance, token.decimals)) {
      setIsMaxSelected(false);
    }
  }, [displayAmount, balance, token.assetId, token.decimals, displayBalance]);

  return (
    <Card>
      <CardHeader className="p-4 pb-3">
        <CardTitle className="text-muted-foreground text-sm font-normal">
          <div className="flex justify-between items-center">
            <span className="font-medium text-base">{label}</span>
            {isLending && (
              <div className="flex items-center gap-1">
                <span className="text-xs px-2 py-0.5 bg-secondary/50 rounded-full ml-2">From {chain.name}</span>
              </div>
            )}
          </div>

          {/* Chain selection removed as requested */}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-y-2 p-4 pt-0 w-full">
        <div className="w-full grid grid-cols-[1fr_max-content] gap-x-4 items-center overflow-hidden">
          <div className="flex flex-col w-full">
            <input
              placeholder="0"
              className={cn(
                "bg-transparent appearance-none focus:outline-none text-3xl w-full",
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
                    "flex items-center gap-x-1 text-sm self-start px-2 py-0.5 whitespace-nowrap truncate max-w-[12rem]",
                    isMaxSelected
                      ? "bg-blue-500/20 rounded text-blue-400 font-medium cursor-default"
                      : "text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded cursor-pointer",
                  )}
                  onClick={handleMaxClick}
                  disabled={disabled || isMaxSelected}
                >
                  <WalletIcon className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">Max: {formatUnits(balance, token.decimals)}</span>
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

          <Select value={token.assetId} disabled={disabled} onValueChange={onTokenChange}>
            <SelectTrigger className="bg-secondary text-secondary-foreground shadow hover:bg-secondary/80 text-base h-fit w-max">
              <SelectValue>
                <div className="flex items-center gap-x-2">
                  <Image src={token.logo} alt={token.symbol} width={20} height={20} className="rounded-xl" />
                  <span className="w-max">{token.symbol}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {repoSupportedTokens.map(tokenConfig => (
                <SelectItem key={tokenConfig.assetId} value={tokenConfig.assetId}>
                  <div className="flex items-center gap-x-2">
                    <Image
                      src={tokenConfig.logo}
                      alt={tokenConfig.symbol}
                      width={20}
                      height={20}
                      className="rounded-xl"
                    />
                    <span className="truncate">{tokenConfig.symbol}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};
