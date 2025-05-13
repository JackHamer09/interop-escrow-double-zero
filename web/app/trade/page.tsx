"use client";

import React, { useState } from "react";
import { useBoolean } from "usehooks-ts";
import { Address, isAddress, parseUnits } from "viem";
import { useAccount } from "wagmi";
import HiddenContent from "~~/components/HiddenContent";
import { TradeForm, TradeList } from "~~/components/Trade";
import { TTBILL_TOKEN, Token, USDC_TOKEN } from "~~/contracts/tokens";
import useTradeEscrow, { EscrowTrade } from "~~/hooks/use-trade-escrow";
import useTtbillToken from "~~/hooks/use-ttbill-token";
import useUsdcToken from "~~/hooks/use-usdc-token";
import { chain1, chain2 } from "~~/services/web3/wagmiConfig";

interface TradeState {
  chainA: number;
  chainB: number;
  tokenA: Token;
  tokenB: Token;
  amountA: bigint;
  amountB: bigint;
  displayAmountA: string;
  displayAmountB: string;
  partyB: Address;
}

export default function AddEscrowedTrade() {
  const usdc = useUsdcToken();
  const ttbill = useTtbillToken();
  const {
    myTrades,
    refetchAll: refetchTrades,
    refetchTokenInfo,
    proposeTradeAndDepositAsync,
    cancelTradeAsync,
    acceptTradeAndDepositAsync,
  } = useTradeEscrow();
  const { address: myAddress } = useAccount();
  const [tradeState, setTradeState] = useState<TradeState>({
    chainA: chain1.id,
    chainB: chain1.id,
    tokenA: USDC_TOKEN,
    tokenB: TTBILL_TOKEN,
    amountA: 0n,
    amountB: 0n,
    displayAmountA: "",
    displayAmountB: "",
    partyB: "",
  });
  const { value: isAddingTrade, setValue: setIsAddingTrade } = useBoolean(false);

  const tokenABalance = tradeState.tokenA.symbol === USDC_TOKEN.symbol ? usdc.balance : ttbill.balance;
  const tokenBBalance = tradeState.tokenB.symbol === USDC_TOKEN.symbol ? usdc.balance : ttbill.balance;

  const handleTokenSelect = (value: string, tokenType: "tokenA" | "tokenB") => {
    const selected = value === USDC_TOKEN.symbol ? USDC_TOKEN : TTBILL_TOKEN;
    const nonSelected = selected === USDC_TOKEN ? TTBILL_TOKEN : USDC_TOKEN;
    const otherTokenType = tokenType === "tokenA" ? "tokenB" : "tokenA";

    setTradeState(prev => ({
      ...prev,
      [tokenType]: selected,
      [otherTokenType]: nonSelected,
      amountA: prev.amountB,
      amountB: prev.amountA,
      displayAmountA: prev.displayAmountB,
      displayAmountB: prev.displayAmountA,
    }));
  };

  const isValidNumber = (value: string): boolean => {
    try {
      parseUnits(value, 18);
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>, tokenType: "tokenA" | "tokenB") => {
    const amount = e.target.value.replace(/,/g, "");
    if (!isValidNumber(amount)) return;

    // If input is empty, reset both amounts
    if (!amount) {
      setTradeState(prev => ({
        ...prev,
        amountA: 0n,
        amountB: 0n,
        displayAmountA: "",
        displayAmountB: "",
      }));
      return;
    }

    setTradeState(prev => ({
      ...prev,
      [tokenType === "tokenA" ? "amountA" : "amountB"]: parseUnits(amount, 18),
      [tokenType === "tokenA" ? "displayAmountA" : "displayAmountB"]: amount,
    }));
  };

  const handlePartyBChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setTradeState(prev => ({
      ...prev,
      partyB: e.target.value as Address,
    }));
  };

  const handleChainChange = async (value: number, chainType: "chainA" | "chainB") => {
    const selectedChain = value === chain1.id ? chain1 : chain2;

    setTradeState(prev => ({
      ...prev,
      [chainType]: selectedChain.id,
    }));
  };

  const handleAddTrade = async () => {
    // Check required fields
    if (tradeState.amountA === 0n || tradeState.amountB === 0n || !isAddress(tradeState.partyB)) {
      return;
    }

    setIsAddingTrade(true);
    try {
      await proposeTradeAndDepositAsync(
        tradeState.partyB,
        tradeState.chainB,
        tradeState.tokenA.address,
        tradeState.amountA,
        tradeState.tokenB.address,
        tradeState.amountB,
      );

      // Reset amount fields after successful trade
      setTradeState(prev => ({
        ...prev,
        amountA: 0n,
        amountB: 0n,
        displayAmountA: "",
        displayAmountB: "",
      }));
    } finally {
      refetchTokenInfo();
      refetchTrades();
      setIsAddingTrade(false);
    }
  };

  const handleCancelTrade = async (tradeId: bigint) => {
    setIsAddingTrade(true);

    try {
      await cancelTradeAsync(tradeId);
    } finally {
      refetchTokenInfo();
      refetchTrades();
      setIsAddingTrade(false);
    }
  };

  const handleAcceptTradeAndDeposit = async (trade: EscrowTrade) => {
    setIsAddingTrade(true);

    try {
      await acceptTradeAndDepositAsync(trade.tradeId);
    } finally {
      refetchTokenInfo();
      refetchTrades();
      setIsAddingTrade(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative">
      <div className="flex flex-col">
        <h2 className="mb-4 font-medium text-2xl">My Escrowed Trades</h2>

        <HiddenContent>
          <div className="card min-w-[450px]">
            <TradeList
              trades={myTrades}
              myAddress={myAddress}
              isAddingTrade={isAddingTrade}
              onAcceptTrade={handleAcceptTradeAndDeposit}
              onCancelTrade={handleCancelTrade}
            />

            <h2 className="mt-12 mb-4 font-medium text-2xl">Propose Trade</h2>

            <div>
              <TradeForm
                tradeState={tradeState}
                tokenABalance={tokenABalance ?? 0n}
                tokenBBalance={tokenBBalance ?? 0n}
                isAddingTrade={isAddingTrade}
                onTokenSelect={handleTokenSelect}
                onAmountChange={handleAmountChange}
                onPartyBChange={handlePartyBChange}
                onChainChange={handleChainChange}
                onSubmit={handleAddTrade}
              />
            </div>
          </div>
        </HiddenContent>
      </div>
    </div>
  );
}
