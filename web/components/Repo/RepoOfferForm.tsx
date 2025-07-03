import React from "react";
import { RepoPoolCard } from "./RepoPoolCard";
import { Hash } from "viem";
import { ArrowsUpDownIcon } from "@heroicons/react/24/outline";
import { Button } from "~~/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~~/components/ui/select";
import { getChainById } from "~~/config/chains-config";
import { isRepoMainChain, repoDurationOptions, repoMainChain, repoSupportedChains } from "~~/config/repo-config";
import { TokenConfig } from "~~/config/tokens-config";

interface RepoOfferFormProps {
  offerState: {
    chainA: number;
    chainB: number;
    lendToken: TokenConfig;
    collateralToken: TokenConfig;
    displayLendAmount: string;
    displayCollateralAmount: string;
    lendAmount: bigint;
    collateralAmount: bigint;
    duration: number;
    lenderFee: bigint;
    displayLenderFee: string;
  };
  lendTokenBalance: bigint;
  collateralTokenBalance: bigint;
  isCreatingOffer: boolean;
  onTokenChange: (tokenAssetId: Hash, tokenType: "lendToken" | "collateralToken") => void;
  onAmountChange: (e: React.ChangeEvent<HTMLInputElement>, tokenType: "lendToken" | "collateralToken") => void;
  onDurationChange: (value: number) => void;
  onFeeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
}

export const RepoOfferForm: React.FC<RepoOfferFormProps> = ({
  offerState,
  lendTokenBalance,
  collateralTokenBalance,
  isCreatingOffer,
  onTokenChange,
  onAmountChange,
  onDurationChange,
  onFeeChange,
  onSubmit,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const mainChain = repoMainChain;
  const chainA = getChainById(offerState.chainA) || mainChain;
  const chainB = getChainById(offerState.chainB) || repoSupportedChains[1];

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Loan Duration</label>
        <Select
          value={offerState.duration.toString()}
          onValueChange={value => onDurationChange(Number(value))}
          disabled={isCreatingOffer}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select duration" />
          </SelectTrigger>
          <SelectContent>
            {repoDurationOptions.map(option => (
              <SelectItem key={option.value} value={option.value.toString()}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Lender Fee (bps)</label>
        <input
          type="number"
          value={offerState.displayLenderFee}
          onChange={onFeeChange}
          disabled={isCreatingOffer}
          placeholder="3"
          min="0"
          max="10000"
          step="1"
          className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
        <p className="text-xs text-muted-foreground mt-1">Fee in basis points (1 bps = 0.01%)</p>
      </div>

      <RepoPoolCard
        isLending={true}
        balance={lendTokenBalance}
        displayBalance={true}
        displayAmount={offerState.displayLendAmount}
        chain={chainA}
        token={offerState.lendToken}
        onAmountChange={e => onAmountChange(e, "lendToken")}
        onTokenChange={e => onTokenChange(e, "lendToken")}
        disabled={isCreatingOffer}
        label="I want to lend"
      />

      <ArrowsUpDownIcon className="h-7 w-7 my-4 mx-auto text-muted-foreground" />

      <RepoPoolCard
        isLending={false}
        balance={collateralTokenBalance}
        displayBalance={false}
        displayAmount={offerState.displayCollateralAmount}
        chain={chainB}
        token={offerState.collateralToken}
        onAmountChange={e => onAmountChange(e, "collateralToken")}
        onTokenChange={e => onTokenChange(e, "collateralToken")}
        disabled={isCreatingOffer}
        label="I want as collateral"
      />

      <Button
        type="submit"
        className="w-full mt-6 h-11"
        disabled={
          !offerState.lendAmount ||
          !offerState.collateralAmount ||
          !offerState.duration ||
          !isRepoMainChain(offerState.chainA)
        }
        loading={isCreatingOffer}
      >
        {!isRepoMainChain(offerState.chainA)
          ? `Please switch to ${mainChain.name} to create an offer`
          : "Create Lending Offer"}
      </Button>
    </form>
  );
};
