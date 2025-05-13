"use client";

import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import { useBoolean } from "usehooks-ts";
import { Address, isAddress, parseUnits } from "viem";
import { useAccount, useChainId } from "wagmi";
import HiddenContent from "~~/components/HiddenContent";
import MintFundsButton from "~~/components/MintFundsButton";
import { TradeForm, TradeList } from "~~/components/Trade";
import { Alert, AlertDescription } from "~~/components/ui/alert";
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
  const walletChainId = useChainId();
  const [tradeState, setTradeState] = useState<TradeState>({
    chainA: chain1.id,
    chainB: chain2.id,
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

    // Only update the token types without swapping amounts
    setTradeState(prev => ({
      ...prev,
      [tokenType]: selected,
      [otherTokenType]: nonSelected,
      // No amount swapping
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

    // Just update the specific input field, even if empty
    if (!amount) {
      setTradeState(prev => ({
        ...prev,
        [tokenType === "tokenA" ? "amountA" : "amountB"]: 0n,
        [tokenType === "tokenA" ? "displayAmountA" : "displayAmountB"]: "",
      }));
      return;
    }

    if (!isValidNumber(amount)) return;

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
    <div className="flex-1 flex flex-col items-center justify-center relative w-full">
      <div className="flex flex-col items-center w-full mt-10">
        <h2 className="mb-4 font-medium text-2xl text-center">My Escrowed Trades</h2>

        <HiddenContent>
          <div className="card w-full max-w-[550px]">
            <TradeList
              trades={myTrades}
              myAddress={myAddress}
              isAddingTrade={isAddingTrade}
              onAcceptTrade={handleAcceptTradeAndDeposit}
              onCancelTrade={handleCancelTrade}
            />

            <div className="flex justify-between items-center mt-12 mb-4">
              <h2 className="font-medium text-2xl">Propose Trade</h2>
              <MintFundsButton variant="outline" size="sm" onMintSuccess={refetchTokenInfo} />
            </div>

            {walletChainId === chain1.id ? (
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
            ) : (
              <Alert variant="warning" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  In current implementation of the demo, you can only propose trades from the {chain1.name} network. If
                  you wish to propose a trade from your current wallet, switch network in your MetaMask wallet to
                  continue.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </HiddenContent>
      </div>
    </div>
  );
}
