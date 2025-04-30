"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ArrowLeftRightIcon, CheckIcon, CopyIcon, DollarSignIcon, XIcon } from "lucide-react";
import { useBoolean } from "usehooks-ts";
import { Address, Chain, isAddress, parseUnits } from "viem";
import { useAccount } from "wagmi";
import { ArrowsUpDownIcon, WalletIcon } from "@heroicons/react/24/outline";
import HiddenContent from "~~/components/HiddenContent";
import { Button } from "~~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~~/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~~/components/ui/select";
import { TTBILL_TOKEN, Token, USDC_TOKEN } from "~~/contracts/tokens";
import useTradeEscrow, { EscrowTrade, EscrowTradeStatus } from "~~/hooks/use-trade-escrow";
import useTtbillToken from "~~/hooks/use-ttbill-token";
import useUsdcToken from "~~/hooks/use-usdc-token";
import { chain1, chain2 } from "~~/services/web3/wagmiConfig";
import { cn } from "~~/utils/cn";
import { formatTokenWithDecimals } from "~~/utils/currency";

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

  const handleAmountChange = async (e: React.ChangeEvent<HTMLInputElement>, tokenType: "tokenA" | "tokenB") => {
    const newDisplayAmount = e.target.value.replace(/,/g, "");

    // Handle non-numbers
    if (isNaN(+newDisplayAmount)) {
      return;
    }

    // If input is empty, reset both amounts
    if (!newDisplayAmount) {
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
      [tokenType === "tokenA" ? "amountA" : "amountB"]: parseUnits(newDisplayAmount, 18),
      [tokenType === "tokenA" ? "displayAmountA" : "displayAmountB"]: newDisplayAmount,
    }));
  };

  const handlePartyBChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setTradeState(prev => ({
      ...prev,
      partyB: e.target.value,
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

      // Reset everything
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

  // Removed handleDepositTrade to enforce strict 2-step process

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative">
      <div className="flex flex-col">
        <h2 className="mb-4 font-medium text-2xl">My Escrowed Trades</h2>

        <HiddenContent>
          <div className="card min-w-[450px]">
            {myTrades && myTrades.length > 0 ? (
              myTrades
                .toSorted((a, b) => {
                  return Number(b.tradeId - a.tradeId);
                })
                .map((trade, i) => (
                  <Card key={i} className="mb-4 hover:bg-slate-400 hover:bg-opacity-5 border-slate-600">
                    <CardHeader className="p-4 pb-3">
                      <CardTitle className="text-muted-foreground text-sm font-normal">
                        <div className="flex flex-col">
                          <div className="text-lg">
                            Trade #{trade.tradeId.toString()}
                            {/* {trade.status == EscrowTradeStatus.PendingCounterpartyDeposit && (
                              <span className="float-right px-2 py-0.5 text-yellow-400 border-yellow-500 border bg-yellow-700 bg-opacity-30 rounded">
                                Waiting for Deposit
                              </span>
                            )}
                            {trade.status == EscrowTradeStatus.Declined && (
                              <span className="float-right px-2 py-0.5 text-red-400 border-red-500 border bg-red-700 bg-opacity-30 rounded">
                                Declined
                              </span>
                            )}
                            {trade.status == EscrowTradeStatus.Complete && (
                              <span className="float-right px-2 py-0.5 border-gray-500 border bg-gray-700 bg-opacity-30 rounded">
                                Complete
                              </span>
                            )} */}
                          </div>

                          <div className="relative px-6 flex justify-center w-full mt-3 mb-12">
                            <ol className="flex items-center w-4/5">
                              <li
                                className={cn(
                                  "flex w-full items-center after:content-[''] after:w-full after:h-1 after:border-b after:border-4 after:inline-block after:border-blue-800 relative",
                                  trade.status === EscrowTradeStatus.Declined && "after:border-red-700/50",
                                )}
                              >
                                <span
                                  className={cn(
                                    "flex items-center justify-center w-8 h-8 rounded-full bg-blue-800 shrink-0",
                                    trade.status === EscrowTradeStatus.Declined && "after:border-red-700 bg-red-800/50",
                                  )}
                                >
                                  {[EscrowTradeStatus.PendingCounterpartyDeposit, EscrowTradeStatus.Complete].includes(
                                    trade.status,
                                  ) && <CheckIcon className="w-5 h-5 text-gray-100" />}
                                  {trade.status === EscrowTradeStatus.Declined && (
                                    <XIcon className="w-5 h-5 text-red-500" />
                                  )}
                                </span>
                                {trade.status === EscrowTradeStatus.Declined ? (
                                  <span className="absolute top-10 -left-5 px-2 py-0.5 text-red-400 border-red-500 border bg-red-700 bg-opacity-30 rounded whitespace-nowrap">
                                    Declined
                                  </span>
                                ) : (
                                  <span className="absolute top-10 -left-10 italic whitespace-nowrap">
                                    Propose & Deposit
                                  </span>
                                )}
                              </li>
                              <li className="flex items-center w-8 relative">
                                <span
                                  className={cn(
                                    "flex items-center justify-center w-8 h-8 rounded-full shrink-0",
                                    trade.status === EscrowTradeStatus.Complete && "bg-blue-800",
                                    trade.status === EscrowTradeStatus.Declined && "bg-red-800/50",
                                    trade.status === EscrowTradeStatus.PendingCounterpartyDeposit && "bg-gray-700",
                                  )}
                                >
                                  {trade.status === EscrowTradeStatus.PendingCounterpartyDeposit &&
                                    (trade.partyB === myAddress && !trade.depositedB ? (
                                      <DollarSignIcon className="w-5 h-5 text-yellow-400" />
                                    ) : (
                                      <DollarSignIcon className="w-5 h-5 text-gray-400" />
                                    ))}
                                  {[EscrowTradeStatus.Complete].includes(trade.status) && (
                                    <CheckIcon className="w-5 h-5 text-gray-100" />
                                  )}
                                  {trade.status === EscrowTradeStatus.Declined && (
                                    <XIcon className="w-5 h-5 text-red-500" />
                                  )}
                                </span>
                                {trade.status === EscrowTradeStatus.PendingCounterpartyDeposit &&
                                trade.partyB === myAddress &&
                                !trade.depositedB ? (
                                  <span className="absolute top-10 left-1/2 transform -translate-x-1/2 px-2 py-0.5 text-yellow-400 border-yellow-500 border bg-yellow-700 bg-opacity-30 rounded text-center whitespace-nowrap">
                                    Your Turn to Deposit
                                  </span>
                                ) : trade.status === EscrowTradeStatus.PendingCounterpartyDeposit &&
                                  (trade.partyA === myAddress || (trade.partyB === myAddress && trade.depositedB)) ? (
                                  <span className="absolute top-10 left-1/2 transform -translate-x-1/2 px-2 py-0.5 text-blue-400 border-blue-500 border bg-blue-700 bg-opacity-30 rounded text-center whitespace-nowrap">
                                    Waiting for Counterparty
                                  </span>
                                ) : trade.status === EscrowTradeStatus.Complete ? (
                                  <span className="absolute top-10 left-1/2 transform -translate-x-1/2 px-2 py-0.5 border-gray-500 border bg-gray-700 bg-opacity-30 rounded whitespace-nowrap">
                                    Completed
                                  </span>
                                ) : trade.status === EscrowTradeStatus.Declined ? (
                                  <span className="absolute top-10 left-1/2 transform -translate-x-1/2 px-2 py-0.5 text-red-400 border-red-500 border bg-red-700 bg-opacity-30 rounded whitespace-nowrap">
                                    Declined
                                  </span>
                                ) : (
                                  <span className="absolute top-10 left-1/2 transform -translate-x-1/2 italic whitespace-nowrap">
                                    Counterparty Deposit
                                  </span>
                                )}
                              </li>
                            </ol>
                          </div>
                        </div>
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="flex flex-col gap-y-2 p-4 pt-0">
                      <div className="flex items-center justify-center mb-2">
                        <div className="flex items-center gap-4 min-w-32 justify-end">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-x-2 mr-2">
                              <Image
                                src={USDC_TOKEN.logo}
                                alt={USDC_TOKEN.symbol}
                                width={20}
                                height={20}
                                className="rounded-xl"
                              />
                              <span>{formatTokenWithDecimals(trade.amountA, 18)}</span>
                              <span>{USDC_TOKEN.symbol}</span>
                            </div>
                            {myAddress == trade.partyA && <span className="text-sm text-muted-foreground">You</span>}
                            {myAddress != trade.partyA && <ShortAddress address={trade.partyA} isRight={false} />}
                          </div>
                        </div>

                        <ArrowLeftRightIcon className="h-7 w-7 my-4 mx-8 text-muted-foreground" />

                        <div className="flex items-center gap-4 min-w-32">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-end gap-x-2">
                              <Image
                                src={TTBILL_TOKEN.logo}
                                alt={TTBILL_TOKEN.symbol}
                                width={20}
                                height={20}
                                className="rounded-xl"
                              />
                              <span>{formatTokenWithDecimals(trade.amountB, 18)}</span>
                              <span>{TTBILL_TOKEN.symbol}</span>
                            </div>
                            {myAddress == trade.partyB && (
                              <span className="text-sm text-muted-foreground text-right">You</span>
                            )}
                            {myAddress != trade.partyB && <ShortAddress address={trade.partyB} isRight={true} />}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-4 items-center justify-center">
                        {trade.status == EscrowTradeStatus.PendingCounterpartyDeposit &&
                          trade.partyB == myAddress &&
                          !trade.depositedB && (
                            <Button
                              className="p-4"
                              loading={isAddingTrade}
                              onClick={() => handleAcceptTradeAndDeposit(trade)}
                            >
                              Deposit My Funds
                            </Button>
                          )}
                        {trade.status == EscrowTradeStatus.PendingCounterpartyDeposit && (
                          <Button
                            className="p-4"
                            variant="destructive"
                            loading={isAddingTrade}
                            onClick={() => handleCancelTrade(trade.tradeId)}
                          >
                            Cancel Trade
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
            ) : (
              <h3>No trades.</h3>
            )}

            <h2 className="mt-12 mb-4 font-medium text-2xl">Propose Trade</h2>

            <div>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleAddTrade();
                }}
              >
                <PoolCard
                  isPartyB={false}
                  balance={tokenABalance ?? 0n}
                  displayBalance={true}
                  displayPartyB={tradeState.partyB}
                  displayAmount={tradeState.displayAmountA}
                  chain={chain1.id === tradeState.chainA ? chain1 : chain2}
                  token={tradeState.tokenA}
                  selectedToken={tradeState.tokenA.symbol}
                  onAmountChange={e => handleAmountChange(e, "tokenA")}
                  onPartyBChange={e => handlePartyBChange(e)}
                  onChainChange={e => handleChainChange(e, "chainA")}
                  onTokenChange={e => handleTokenSelect(e, "tokenA")}
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
                  onAmountChange={e => handleAmountChange(e, "tokenB")}
                  onPartyBChange={e => handlePartyBChange(e)}
                  onChainChange={e => handleChainChange(e, "chainB")}
                  onTokenChange={e => handleTokenSelect(e, "tokenB")}
                  disabled={isAddingTrade}
                />

                <Button
                  type="submit"
                  className="w-full mt-6 h-11"
                  disabled={
                    !tradeState.amountA ||
                    !tradeState.amountB ||
                    !isAddress(tradeState.partyB) ||
                    tradeState.chainA !== chain1.id
                  }
                  loading={isAddingTrade}
                >
                  {tradeState.chainA !== chain1.id
                    ? `Please switch to ${chain1.name} to propose a trade`
                    : "Propose Trade & Deposit"}
                </Button>
              </form>
            </div>
          </div>
        </HiddenContent>
      </div>
    </div>
  );
}

function ShortAddress({ address, isRight }: { address: string; isRight: boolean }) {
  const shortAddress = address.slice(0, 5) + "..." + address.slice(address.length - 6, address.length);

  return (
    <div
      className={cn(
        "flex items-center text-sm text-muted-foreground hover:text-white hover:cursor-pointer",
        isRight && "justify-end",
      )}
      onClick={() => navigator.clipboard.writeText(address)}
    >
      {shortAddress}
      <CopyIcon className="h-4 w-4 ml-2" />
    </div>
  );
}

function PoolCard({
  isPartyB,
  displayPartyB,
  balance,
  displayBalance,
  onAmountChange,
  onPartyBChange,
  onTokenChange,
  onChainChange,
  disabled,
  displayAmount,
  chain,
  token,
  selectedToken,
}: {
  isPartyB: boolean;
  displayPartyB: string;
  balance: bigint;
  displayBalance: boolean;
  displayAmount: string;
  chain: Chain;
  token: Token;
  onAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPartyBChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedToken: Token["symbol"];
  onChainChange: (value: number) => void;
  onTokenChange: (value: string) => void;
  disabled: boolean;
}) {
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
}
