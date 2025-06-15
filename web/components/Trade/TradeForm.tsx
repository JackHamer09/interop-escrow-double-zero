import React from "react";
import { PoolCard } from "./PoolCard";
import { Address, Hash, isAddress } from "viem";
import { ArrowsUpDownIcon } from "@heroicons/react/24/outline";
import { Button } from "~~/components/ui/button";
import { getChainById } from "~~/config/chains-config";
import { escrowMainChain, escrowSupportedChains, isEscrowMainChain } from "~~/config/escrow-trade-config";
import { TokenConfig } from "~~/config/tokens-config";

interface TradeFormProps {
  tradeState: {
    chainA: number;
    chainB: number;
    tokenA: TokenConfig;
    tokenB: TokenConfig;
    displayAmountA: string;
    displayAmountB: string;
    partyB: Address;
    amountA: bigint;
    amountB: bigint;
  };
  tokenABalance: bigint;
  tokenBBalance: bigint;
  isAddingTrade: boolean;
  onTokenChange: (tokenAssetId: Hash, tokenType: "tokenA" | "tokenB") => void;
  onAmountChange: (e: React.ChangeEvent<HTMLInputElement>, tokenType: "tokenA" | "tokenB") => void;
  onPartyBChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onChainChange: (value: number, chainType: "chainA" | "chainB") => void;
  onSubmit: () => void;
}

export const TradeForm: React.FC<TradeFormProps> = ({
  tradeState,
  tokenABalance,
  tokenBBalance,
  isAddingTrade,
  onTokenChange,
  onAmountChange,
  onPartyBChange,
  onChainChange,
  onSubmit,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const mainChain = escrowMainChain;
  const chainA = getChainById(tradeState.chainA) || mainChain;
  const chainB = getChainById(tradeState.chainB) || escrowSupportedChains[1];

  return (
    <form onSubmit={handleSubmit}>
      <PoolCard
        isPartyB={false}
        balance={tokenABalance}
        displayBalance={true}
        displayPartyB={tradeState.partyB}
        displayAmount={tradeState.displayAmountA}
        chain={chainA}
        token={tradeState.tokenA}
        onAmountChange={e => onAmountChange(e, "tokenA")}
        onPartyBChange={onPartyBChange}
        onChainChange={e => onChainChange(e, "chainA")}
        onTokenChange={e => onTokenChange(e, "tokenA")}
        disabled={isAddingTrade}
      />

      <ArrowsUpDownIcon className="h-7 w-7 my-4 mx-auto text-muted-foreground" />

      <PoolCard
        isPartyB={true}
        balance={tokenBBalance}
        displayBalance={false}
        displayPartyB={tradeState.partyB}
        displayAmount={tradeState.displayAmountB}
        chain={chainB}
        token={tradeState.tokenB}
        onAmountChange={e => onAmountChange(e, "tokenB")}
        onPartyBChange={onPartyBChange}
        onChainChange={e => onChainChange(e, "chainB")}
        onTokenChange={e => onTokenChange(e, "tokenB")}
        disabled={isAddingTrade}
      />

      <Button
        type="submit"
        className="w-full mt-6 h-11"
        disabled={
          !tradeState.amountA ||
          !tradeState.amountB ||
          !isAddress(tradeState.partyB) ||
          !isEscrowMainChain(tradeState.chainA)
        }
        loading={isAddingTrade}
      >
        {!isEscrowMainChain(tradeState.chainA)
          ? `Please switch to ${mainChain.name} to propose a trade`
          : "Propose Trade & Deposit"}
      </Button>
    </form>
  );
};
