"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  ArrowLeftRightIcon,
  CheckIcon,
  ClipboardCheckIcon,
  CopyIcon,
  DollarSignIcon,
  HandshakeIcon,
  XIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { useBoolean } from "usehooks-ts";
import { Address, isAddress, parseUnits } from "viem";
import { useAccount } from "wagmi";
import { ArrowsUpDownIcon, WalletIcon } from "@heroicons/react/24/outline";
import HiddenContent from "~~/components/HiddenContent";
import { Button } from "~~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~~/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~~/components/ui/select";
import { Token, USDG_TOKEN, WAAPL_TOKEN } from "~~/contracts/tokens";
import useTradeEscrow, { EscrowTrade, EscrowTradeStatus } from "~~/hooks/use-trade-escrow";
import useUsdgToken from "~~/hooks/use-usdg-token";
import useWaaplToken from "~~/hooks/use-waapl-token";
import { cn } from "~~/utils/cn";
import { formatTokenWithDecimals } from "~~/utils/currency";
import waitForTransactionReceipt from "~~/utils/wait-for-transaction";

interface TradeState {
  tokenA: Token;
  tokenB: Token;
  amountA: bigint;
  amountB: bigint;
  displayAmountA: string;
  displayAmountB: string;
  partyB: Address;
}

export default function AddEscrowedTrade() {
  const usdg = useUsdgToken();
  const waapl = useWaaplToken();
  const {
    myTrades,
    refetchAll: refetchTrades,
    proposeTradeAsync,
    cancelTradeAsync,
    acceptTradeAsync,
    depositTradeAsync,
  } = useTradeEscrow();
  const { address: myAddress } = useAccount();
  const [tradeState, setTradeState] = useState<TradeState>({
    tokenA: USDG_TOKEN,
    tokenB: WAAPL_TOKEN,
    amountA: 0n,
    amountB: 0n,
    displayAmountA: "",
    displayAmountB: "",
    partyB: "",
  });
  const { value: isAddingTrade, setValue: setIsAddingTrade } = useBoolean(false);

  const tokenABalance = tradeState.tokenA.symbol === USDG_TOKEN.symbol ? usdg.balance : waapl.balance;
  const tokenBBalance = tradeState.tokenB.symbol === USDG_TOKEN.symbol ? usdg.balance : waapl.balance;

  const handleTokenSelect = (value: string, tokenType: "tokenA" | "tokenB") => {
    const selected = value === USDG_TOKEN.symbol ? USDG_TOKEN : WAAPL_TOKEN;
    const nonSelected = selected === USDG_TOKEN ? WAAPL_TOKEN : USDG_TOKEN;
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

  const handleAddTrade = async () => {
    if (tradeState.amountA === 0n || tradeState.amountB === 0n || !isAddress(tradeState.partyB)) {
      return;
    }

    setIsAddingTrade(true);

    try {
      const createTrade = await toast.promise(
        proposeTradeAsync(
          tradeState.partyB,
          tradeState.tokenA.address,
          tradeState.amountA,
          tradeState.tokenB.address,
          tradeState.amountB,
        ),
        {
          loading: "Proposing trade...",
          success: "Trade created successfully!",
          error: err => {
            console.error(err);
            return "Failed to create trade";
          },
        },
      );

      await toast.promise(waitForTransactionReceipt({ hash: createTrade }), {
        loading: "Waiting for proposal confirmation...",
        success: "Trade proposal confirmed!",
        error: err => {
          console.error(err);
          return "Failed to create trade";
        },
      });

      // Reset everything
      setTradeState(prev => ({
        ...prev,
        amountA: 0n,
        amountB: 0n,
        displayAmountA: "",
        displayAmountB: "",
      }));
    } finally {
      usdg.refetchAll();
      waapl.refetchAll();
      refetchTrades();
      setIsAddingTrade(false);
    }
  };

  const handleCancelTrade = async (tradeId: bigint) => {
    setIsAddingTrade(true);

    try {
      const cancelTrade = await toast.promise(cancelTradeAsync(tradeId), {
        loading: "Canceling trade...",
        success: "Trade cancelled!",
        error: err => {
          console.error(err);
          return "Failed to cancel trade";
        },
      });

      await toast.promise(waitForTransactionReceipt({ hash: cancelTrade }), {
        loading: "Waiting for cancel confirmation...",
        success: "Trade cancel confirmed!",
        error: err => {
          console.error(err);
          return "Failed to cancel trade";
        },
      });
    } finally {
      usdg.refetchAll();
      waapl.refetchAll();
      refetchTrades();
      setIsAddingTrade(false);
    }
  };

  const handleAcceptTrade = async (tradeId: bigint) => {
    setIsAddingTrade(true);

    try {
      const acceptTrade = await toast.promise(acceptTradeAsync(tradeId), {
        loading: "Accepting trade...",
        success: "Trade accepted!",
        error: err => {
          console.error(err);
          return "Failed to accept trade";
        },
      });

      await toast.promise(waitForTransactionReceipt({ hash: acceptTrade }), {
        loading: "Waiting for accept confirmation...",
        success: "Trade accept confirmed!",
        error: err => {
          console.error(err);
          return "Failed to accept trade";
        },
      });
    } finally {
      usdg.refetchAll();
      waapl.refetchAll();
      refetchTrades();
      setIsAddingTrade(false);
    }
  };

  const handleDepositTrade = async (trade: EscrowTrade) => {
    setIsAddingTrade(true);

    const tokenA = trade.tokenA === USDG_TOKEN.address ? usdg : waapl;
    const tokenB = trade.tokenB === USDG_TOKEN.address ? usdg : waapl;

    try {
      // Check allowances for both tokens
      if (trade.partyA === myAddress && (tokenA.allowance ?? 0n) < trade.amountA) {
        const approveTokenA = await toast.promise(tokenA.approve(trade.amountA), {
          loading: `Approving use of ${tokenA.tokenSymbol} funds...`,
          success: `${tokenA.tokenSymbol} approved!`,
          error: err => {
            console.error(err);
            return `Failed to approve ${tokenA.tokenSymbol}`;
          },
        });
        await toast.promise(waitForTransactionReceipt({ hash: approveTokenA }), {
          loading: `Waiting for ${tokenA.tokenSymbol} approval confirmation...`,
          success: `${tokenA.tokenSymbol} approval confirmed!`,
          error: err => {
            console.error(err);
            return `Failed to approve ${tokenA.tokenSymbol}`;
          },
        });
      }

      if (trade.partyB === myAddress && (tokenB.allowance ?? 0n) < trade.amountB) {
        const approveTokenB = await toast.promise(tokenB.approve(trade.amountB), {
          loading: `Approving use of ${tokenB.tokenSymbol} funds...`,
          success: `${tokenB.tokenSymbol} approved!`,
          error: err => {
            console.error(err);
            return `Failed to approve ${tokenB.tokenSymbol}`;
          },
        });
        await toast.promise(waitForTransactionReceipt({ hash: approveTokenB }), {
          loading: `Waiting for ${tokenB.tokenSymbol} approval confirmation...`,
          success: `${tokenB.tokenSymbol} approval confirmed!`,
          error: err => {
            console.error(err);
            return `Failed to approve ${tokenB.tokenSymbol}`;
          },
        });
      }

      const acceptTrade = await toast.promise(depositTradeAsync(trade.tradeId), {
        loading: "Despositing funds for trade...",
        success: "Trade funded!",
        error: err => {
          console.error(err);
          return "Failed to deposit trade funds";
        },
      });

      await toast.promise(waitForTransactionReceipt({ hash: acceptTrade }), {
        loading: "Waiting for deposit confirmation...",
        success: "Trade funds deposited!",
        error: err => {
          console.error(err);
          return "Failed to deposit trade funds";
        },
      });
    } finally {
      usdg.refetchAll();
      waapl.refetchAll();
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
                            {/* {trade.status == EscrowTradeStatus.PendingApproval && (
                              <span className="float-right px-2 py-0.5 text-green-400 border-green-500 border bg-green-700 bg-opacity-30 rounded">
                                Pending Approval
                              </span>
                            )}
                            {trade.status == EscrowTradeStatus.PendingFunds && (
                              <span className="float-right px-2 py-0.5 text-yellow-400 border-yellow-500 border bg-yellow-700 bg-opacity-30 rounded">
                                Pending Funds
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

                          <div className="flex justify-center w-full mt-3 mb-12">
                            <ol className="flex items-center w-4/5">
                              <li
                                className={cn(
                                  "flex w-full items-center after:content-[''] after:w-full after:h-1 after:border-b after:border-4 after:inline-block after:border-blue-800 relative",
                                  trade.status === EscrowTradeStatus.PendingApproval && "after:border-gray-700",
                                  trade.status === EscrowTradeStatus.Declined && "after:border-red-700/50",
                                )}
                              >
                                <span
                                  className={cn(
                                    "flex items-center justify-center w-8 h-8 rounded-full bg-blue-800 shrink-0",
                                    [EscrowTradeStatus.PendingFunds, EscrowTradeStatus.Complete].includes(
                                      trade.status,
                                    ) && "after:border-gray-700 bg-blue-800",
                                    trade.status === EscrowTradeStatus.Declined && "after:border-red-700 bg-red-800/50",
                                  )}
                                >
                                  {trade.status === EscrowTradeStatus.PendingApproval && (
                                    <HandshakeIcon className="w-5 h-5 text-gray-100" />
                                  )}
                                  {[EscrowTradeStatus.PendingFunds, EscrowTradeStatus.Complete].includes(
                                    trade.status,
                                  ) && <CheckIcon className="w-5 h-5 text-gray-100" />}
                                  {trade.status === EscrowTradeStatus.Declined && (
                                    <XIcon className="w-5 h-5 text-red-500" />
                                  )}
                                </span>
                                {(trade.status === EscrowTradeStatus.PendingFunds ||
                                  trade.status === EscrowTradeStatus.Complete) && (
                                  <span className="absolute top-10 -left-7 italic">Trade Agreed</span>
                                )}
                                {trade.status === EscrowTradeStatus.PendingApproval && (
                                  <span
                                    className={cn(
                                      "absolute top-9 -left-10 px-2 py-0.5 text-green-400 border-green-500 border bg-green-700 bg-opacity-30 rounded text-center",
                                      trade.partyB == myAddress && "text-yellow-400 border-yellow-500 bg-yellow-700",
                                    )}
                                  >
                                    Waiting for <br></br>{trade.partyB == myAddress ? "Your" : "Party"} Approval
                                  </span>
                                )}
                              </li>
                              <li
                                className={cn(
                                  "flex w-full items-center after:content-[''] after:w-full after:h-1 after:border-b after:border-4 after:inline-block after:border-blue-800 relative",
                                  [EscrowTradeStatus.PendingApproval, EscrowTradeStatus.PendingFunds].includes(
                                    trade.status,
                                  ) && "after:border-gray-700",
                                  trade.status === EscrowTradeStatus.Declined && "after:border-red-700/50",
                                )}
                              >
                                <span
                                  className={cn(
                                    "flex items-center justify-center w-8 h-8 rounded-full bg-blue-800 shrink-0",
                                    trade.status === EscrowTradeStatus.PendingApproval && "bg-gray-700",
                                    trade.status === EscrowTradeStatus.Complete && "after:border-gray-700 bg-blue-800",
                                    trade.status === EscrowTradeStatus.Declined && "after:border-red-700 bg-red-800/50",
                                  )}
                                >
                                  {trade.status === EscrowTradeStatus.PendingApproval && (
                                    <DollarSignIcon className="w-5 h-5 text-gray-400" />
                                  )}
                                  {trade.status === EscrowTradeStatus.PendingFunds && (
                                    <DollarSignIcon className="w-5 h-5 text-gray-100" />
                                  )}
                                  {trade.status === EscrowTradeStatus.Complete && (
                                    <CheckIcon className="w-5 h-5 text-gray-100" />
                                  )}
                                  {trade.status === EscrowTradeStatus.Declined && (
                                    <XIcon className="w-5 h-5 text-red-500" />
                                  )}
                                </span>
                                {trade.status === EscrowTradeStatus.Complete && (
                                  <span className="absolute top-10 -left-10 italic">Funds Submitted</span>
                                )}
                                {trade.status === EscrowTradeStatus.PendingApproval && (
                                  <span className="absolute top-10 -left-8 italic">Submit Funds</span>
                                )}
                                {trade.status == EscrowTradeStatus.PendingFunds &&
                                  ((trade.partyA == myAddress && trade.depositedA == false) ||
                                    (trade.partyB == myAddress && trade.depositedB == false)) && (
                                    <span className="absolute top-10 -left-10 px-2 py-0.5 text-yellow-400 border-yellow-500 border bg-yellow-700 bg-opacity-30 rounded text-center">
                                      Submit Funds
                                    </span>
                                  )}
                                {trade.status == EscrowTradeStatus.PendingFunds &&
                                  ((trade.partyA == myAddress && trade.depositedA) ||
                                    (trade.partyB == myAddress && trade.depositedB)) && (
                                    <span className="absolute top-9 -left-8 px-2 py-0.5 text-green-400 border-green-500 border bg-green-700 bg-opacity-30 rounded text-center">
                                      Waiting on <br></br> Party Funds
                                    </span>
                                  )}
                                {trade.status == EscrowTradeStatus.Declined && (
                                  <span className="absolute top-10 -left-5 px-2 py-0.5 text-red-400 border-red-500 border bg-red-700 bg-opacity-30 rounded">
                                    Declined
                                  </span>
                                )}
                              </li>
                              <li className="flex items-center w-8 relative">
                                <span
                                  className={cn(
                                    "flex items-center justify-center w-8 h-8 rounded-full bg-gray-700 shrink-0",
                                    trade.status === EscrowTradeStatus.Complete && "bg-blue-800",
                                    trade.status === EscrowTradeStatus.Declined && "bg-red-800/50",
                                  )}
                                >
                                  {[EscrowTradeStatus.PendingApproval, EscrowTradeStatus.PendingFunds].includes(
                                    trade.status,
                                  ) && <ClipboardCheckIcon className="w-5 h-5 text-gray-400" />}
                                  {[EscrowTradeStatus.Complete].includes(trade.status) && (
                                    <CheckIcon className="w-5 h-5 text-gray-100" />
                                  )}
                                  {trade.status === EscrowTradeStatus.Declined && (
                                    <XIcon className="w-5 h-5 text-red-500" />
                                  )}
                                </span>
                                {(trade.status === EscrowTradeStatus.PendingApproval ||
                                  trade.status === EscrowTradeStatus.PendingFunds) && (
                                  <span className="absolute top-10 -left-4 text-right italic">Complete</span>
                                )}
                                {trade.status === EscrowTradeStatus.Complete && (
                                  <span className="absolute top-10 -left-7 px-2 py-0.5 border-gray-500 border bg-gray-700 bg-opacity-30 rounded">
                                    Completed
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
                                src={USDG_TOKEN.logo}
                                alt={USDG_TOKEN.symbol}
                                width={20}
                                height={20}
                                className="rounded-xl"
                              />
                              <span>{formatTokenWithDecimals(trade.amountA, 18)}</span>
                              <span>{USDG_TOKEN.symbol}</span>
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
                                src={WAAPL_TOKEN.logo}
                                alt={WAAPL_TOKEN.symbol}
                                width={20}
                                height={20}
                                className="rounded-xl"
                              />
                              <span>{formatTokenWithDecimals(trade.amountB, 18)}</span>
                              <span>{WAAPL_TOKEN.symbol}</span>
                            </div>
                            {myAddress == trade.partyB && (
                              <span className="text-sm text-muted-foreground text-right">You</span>
                            )}
                            {myAddress != trade.partyB && <ShortAddress address={trade.partyB} isRight={true} />}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-4 items-center justify-center">
                        {trade.status == EscrowTradeStatus.PendingApproval && trade.partyB == myAddress && (
                          <Button
                            className="p-4"
                            loading={isAddingTrade}
                            onClick={() => handleAcceptTrade(trade.tradeId)}
                          >
                            Accept Trade
                          </Button>
                        )}
                        {trade.status == EscrowTradeStatus.PendingFunds &&
                          ((trade.partyA == myAddress && trade.depositedA == false) ||
                            (trade.partyB == myAddress && trade.depositedB == false)) && (
                            <Button
                              className="p-4"
                              loading={isAddingTrade}
                              onClick={() => handleDepositTrade(trade)}
                            >
                              Deposit Funds
                            </Button>
                          )}
                        {(trade.status == EscrowTradeStatus.PendingApproval ||
                          trade.status == EscrowTradeStatus.PendingFunds) && (
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
                  token={tradeState.tokenA}
                  selectedToken={tradeState.tokenA.symbol}
                  onAmountChange={e => handleAmountChange(e, "tokenA")}
                  onPartyBChange={e => handlePartyBChange(e)}
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
                  token={tradeState.tokenB}
                  selectedToken={tradeState.tokenB.symbol}
                  onAmountChange={e => handleAmountChange(e, "tokenB")}
                  onPartyBChange={e => handlePartyBChange(e)}
                  onTokenChange={e => handleTokenSelect(e, "tokenB")}
                  disabled={isAddingTrade}
                />

                <Button
                  type="submit"
                  className="w-full mt-6 h-11"
                  disabled={!tradeState.amountA || !tradeState.amountB || !isAddress(tradeState.partyB)}
                  loading={isAddingTrade}
                >
                  Propose Trade
                </Button>
              </form>
            </div>
          </div>
        </HiddenContent>
      </div>
    </div>
  );
}

function ShortAddress({ address, isRight }: { address: string, isRight: boolean }) {
  const shortAddress = address.slice(0, 5) + "..." + address.slice(address.length - 6, address.length);

  return (
    <div
      className={cn("flex items-center text-sm text-muted-foreground hover:text-white hover:cursor-pointer", isRight && "justify-end")}
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
  disabled,
  displayAmount,
  token,
  selectedToken,
}: {
  isPartyB: boolean;
  displayPartyB: string;
  balance: bigint;
  displayBalance: boolean;
  displayAmount: string;
  token: Token;
  onAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPartyBChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedToken: Token["symbol"];
  onTokenChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <Card>
      <CardHeader className="p-4 pb-3">
        <CardTitle className="text-muted-foreground text-sm font-normal">
          {isPartyB === false && "You"}
          {isPartyB === true && (
            <input
              placeholder="0xa1b2c3..."
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
                <SelectItem value="USDG">
                  <div className="flex items-center gap-x-2 mr-2">
                    <Image
                      src={USDG_TOKEN.logo}
                      alt={USDG_TOKEN.symbol}
                      width={20}
                      height={20}
                      className="rounded-xl"
                    />
                    {USDG_TOKEN.symbol}
                  </div>
                </SelectItem>
                <SelectItem value="wAAPL">
                  <div className="flex items-center gap-x-2 mr-2">
                    <Image
                      src={WAAPL_TOKEN.logo}
                      alt={WAAPL_TOKEN.symbol}
                      width={20}
                      height={20}
                      className="rounded-xl"
                    />
                    {WAAPL_TOKEN.symbol}
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
