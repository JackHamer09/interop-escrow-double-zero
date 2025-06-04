"use client";

import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import { useBoolean } from "usehooks-ts";
import { Address, isAddress, parseUnits } from "viem";
import { useAccount, useChainId } from "wagmi";
import HiddenContent from "~~/components/HiddenContent";
import MintFundsButton from "~~/components/MintFundsButton";
import { TokenBalances, TradeForm, TradeList } from "~~/components/Trade";
import { Alert, AlertDescription } from "~~/components/ui/alert";
import {
  escrowMainChain,
  escrowSupportedChains,
  getEscrowChainById,
  isEscrowMainChain,
} from "~~/config/escrow-trade-config";
import { escrowSupportedTokens } from "~~/config/escrow-trade-config";
import { TokenConfig, getTokenByAssetId } from "~~/config/tokens-config";
import useTradeEscrow, { EscrowTrade } from "~~/hooks/use-trade-escrow";

interface TradeState {
  chainA: number;
  chainB: number;
  tokenA: TokenConfig;
  tokenB: TokenConfig;
  amountA: bigint;
  amountB: bigint;
  displayAmountA: string;
  displayAmountB: string;
  partyB: Address;
}

export default function AddEscrowedTrade() {
  const [isRefreshingBalances, setIsRefreshingBalances] = useState(false);
  const {
    myTrades,
    refetchAll: refetchTrades,
    refetchTokens,
    proposeTradeAndDepositAsync,
    cancelTradeAsync,
    acceptTradeAndDepositAsync,
    tokens,
  } = useTradeEscrow();

  const { address: myAddress } = useAccount();
  const walletChainId = useChainId();

  // Get supported tokens from configuration
  if (escrowSupportedTokens.length < 2) {
    throw new Error("At least two supported tokens are required");
  }

  // Default to first two tokens if available
  const defaultTokenA = escrowSupportedTokens[0];
  const defaultTokenB = escrowSupportedTokens[1];

  const mainChain = escrowMainChain;
  const supportedChain = escrowSupportedChains.find(chain => chain.id !== mainChain.id);

  if (!supportedChain) {
    throw new Error("No secondary chain configured");
  }

  const [tradeState, setTradeState] = useState<TradeState>({
    chainA: mainChain.id,
    chainB: supportedChain.id,
    tokenA: defaultTokenA,
    tokenB: defaultTokenB,
    amountA: 0n,
    amountB: 0n,
    displayAmountA: "",
    displayAmountB: "",
    partyB: "",
  });
  const { value: isAddingTrade, setValue: setIsAddingTrade } = useBoolean(false);

  // Find token balances for the selected tokens
  const tokenAWithBalance = tokens.find(token => token.symbol === tradeState.tokenA.symbol);
  const tokenBWithBalance = tokens.find(token => token.symbol === tradeState.tokenB.symbol);

  const tokenABalance = tokenAWithBalance?.balance || 0n;
  const tokenBBalance = tokenBWithBalance?.balance || 0n;

  const handleRefreshBalances = async () => {
    setIsRefreshingBalances(true);
    try {
      await Promise.all([
        new Promise(resolve => setTimeout(resolve, 500)), // Simulate a delay
        refetchTokens(),
      ]);
    } finally {
      setIsRefreshingBalances(false);
    }
  };

  const handleTokenSelect = (value: string, tokenType: "tokenA" | "tokenB") => {
    const selectedToken = getTokenByAssetId(value);
    if (!selectedToken) return;

    // Get the token that would be the opposite (to ensure we don't use the same token twice)
    const otherTokenType = tokenType === "tokenA" ? "tokenB" : "tokenA";
    const currentOtherToken = tradeState[otherTokenType];

    // If the selected token is the same as the other token, find a different token
    let otherToken = currentOtherToken;

    if (selectedToken.symbol === currentOtherToken.symbol) {
      // Find the first token that isn't the selected one
      const differentToken = escrowSupportedTokens.find(t => t.symbol !== selectedToken.symbol);
      if (differentToken) {
        otherToken = differentToken;
      }
    }

    // Only update the token types without swapping amounts
    setTradeState(prev => ({
      ...prev,
      [tokenType]: selectedToken,
      [otherTokenType]: otherToken,
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
    const selectedChain = getEscrowChainById(value);
    if (!selectedChain) return;

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
      // Get the token addresses for the respective chains
      const tokenAAddress = tradeState.tokenA.addresses[tradeState.chainA];
      const tokenBAddress = tradeState.tokenB.addresses[tradeState.chainB];

      if (!tokenAAddress || !tokenBAddress) {
        throw new Error("Token not supported on selected chain");
      }

      const result = await proposeTradeAndDepositAsync(
        tradeState.partyB,
        tradeState.chainB,
        tokenAAddress,
        tradeState.amountA,
        tokenBAddress,
        tradeState.amountB,
      );

      // Only reset amount fields if the trade was successful (not false)
      if (result !== false) {
        setTradeState(prev => ({
          ...prev,
          amountA: 0n,
          amountB: 0n,
          displayAmountA: "",
          displayAmountB: "",
        }));
      }
    } finally {
      refetchTokens();
      refetchTrades();
      setIsAddingTrade(false);
    }
  };

  const handleCancelTrade = async (tradeId: bigint) => {
    setIsAddingTrade(true);

    try {
      await cancelTradeAsync(tradeId);
    } finally {
      refetchTokens();
      refetchTrades();
      setIsAddingTrade(false);
    }
  };

  const handleAcceptTradeAndDeposit = async (trade: EscrowTrade) => {
    setIsAddingTrade(true);

    try {
      await acceptTradeAndDepositAsync(trade.tradeId);
    } finally {
      refetchTokens();
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
              <MintFundsButton variant="outline" size="sm" onMintSuccess={refetchTokens} />
            </div>

            {isEscrowMainChain(walletChainId || 0) ? (
              <div>
                <TradeForm
                  tradeState={tradeState}
                  tokenABalance={tokenABalance}
                  tokenBBalance={tokenBBalance}
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
                  In current implementation of the demo, you can only propose trades from the {mainChain.name} network.
                  If you wish to propose a trade from your current wallet, switch network in your MetaMask wallet to
                  continue.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Token Balances Section */}
          <TokenBalances tokens={tokens} isRefreshing={isRefreshingBalances} onRefresh={handleRefreshBalances} />
        </HiddenContent>
      </div>
    </div>
  );
}
