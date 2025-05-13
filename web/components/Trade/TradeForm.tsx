import React from "react";
import { PoolCard } from "./PoolCard";
import { Address, isAddress } from "viem";
import { ArrowsUpDownIcon } from "@heroicons/react/24/outline";
import { Button } from "~~/components/ui/button";
import { Token } from "~~/contracts/tokens";
import { chain1, chain2 } from "~~/services/web3/wagmiConfig";

interface TradeFormProps {
  tradeState: {
    chainA: number;
    chainB: number;
    tokenA: Token;
    tokenB: Token;
    displayAmountA: string;
    displayAmountB: string;
    partyB: Address;
    amountA: bigint;
    amountB: bigint;
  };
  tokenABalance: bigint;
  tokenBBalance: bigint;
  isAddingTrade: boolean;
  onTokenSelect: (value: string, tokenType: "tokenA" | "tokenB") => void;
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
  onTokenSelect,
  onAmountChange,
  onPartyBChange,
  onChainChange,
  onSubmit,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit}>
      <PoolCard
        isPartyB={false}
        balance={tokenABalance ?? 0n}
        displayBalance={true}
        displayPartyB={tradeState.partyB}
        displayAmount={tradeState.displayAmountA}
        chain={chain1.id === tradeState.chainA ? chain1 : chain2}
        token={tradeState.tokenA}
        selectedToken={tradeState.tokenA.symbol}
        onAmountChange={e => onAmountChange(e, "tokenA")}
        onPartyBChange={onPartyBChange}
        onChainChange={e => onChainChange(e, "chainA")}
        onTokenChange={e => onTokenSelect(e, "tokenA")}
        disabled={isAddingTrade}
      />

      <ArrowsUpDownIcon className="h-7 w-7 my-4 mx-auto text-muted-foreground" />

      <PoolCard
        isPartyB={true}
        balance={tokenBBalance ?? 0n}
        displayBalance={false}
        displayPartyB={tradeState.partyB}
        displayAmount={tradeState.displayAmountB}
        chain={chain1.id === tradeState.chainB ? chain1 : chain2}
        token={tradeState.tokenB}
        selectedToken={tradeState.tokenB.symbol}
        onAmountChange={e => onAmountChange(e, "tokenB")}
        onPartyBChange={onPartyBChange}
        onChainChange={e => onChainChange(e, "chainB")}
        onTokenChange={e => onTokenSelect(e, "tokenB")}
        disabled={isAddingTrade}
      />

      <Button
        type="submit"
        className="w-full mt-6 h-11"
        disabled={
          !tradeState.amountA || !tradeState.amountB || !isAddress(tradeState.partyB) || tradeState.chainA !== chain1.id
        }
        loading={isAddingTrade}
      >
        {tradeState.chainA !== chain1.id
          ? `Please switch to ${chain1.name} to propose a trade`
          : "Propose Trade & Deposit"}
      </Button>
    </form>
  );
};
