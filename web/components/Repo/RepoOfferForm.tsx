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
  onChainChange: (value: number, chainType: "chainA" | "chainB") => void;
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
  onChainChange,
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
        <label className="block text-sm font-medium mb-2">Lender Fee (%)</label>
        <input
          type="number"
          value={offerState.displayLenderFee}
          onChange={onFeeChange}
          disabled={isCreatingOffer}
          placeholder="0.00"
          min="0"
          max="100"
          step="0.01"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <p className="text-xs text-gray-500 mt-1">
          Fee percentage that borrowers will pay on top of the loan amount (e.g., 0.3% means borrowers repay 100.3% of
          the loan)
        </p>
      </div>

      <RepoPoolCard
        isLending={true}
        balance={lendTokenBalance}
        displayBalance={true}
        displayAmount={offerState.displayLendAmount}
        chain={chainA}
        token={offerState.lendToken}
        onAmountChange={e => onAmountChange(e, "lendToken")}
        onChainChange={e => onChainChange(e, "chainA")}
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
        onChainChange={e => onChainChange(e, "chainB")}
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
