"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { useBoolean } from "usehooks-ts";
import { parseUnits } from "viem";
import { useWriteContract } from "wagmi";
import { AdjustmentsHorizontalIcon, PlusCircleIcon, WalletIcon } from "@heroicons/react/24/outline";
import HiddenContent from "~~/components/HiddenContent";
import { Button } from "~~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~~/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~~/components/ui/select";
import { CPAMM_ABI, CPAMM_ADDRESS } from "~~/contracts/cpamm";
import { DAI_TOKEN, Token, WBTC_TOKEN } from "~~/contracts/tokens";
import useCpamm from "~~/hooks/use-cpamm";
import useDaiToken from "~~/hooks/use-dai-token";
import useWbtcToken from "~~/hooks/use-wbtc-token";
import { cn } from "~~/utils/cn";
import { formatTokenWithDecimals } from "~~/utils/currency";
import waitForTransactionReceipt from "~~/utils/wait-for-transaction";

interface PoolState {
  tokenA: Token;
  tokenB: Token;
  amountA: bigint;
  amountB: bigint;
  displayAmountA: string;
  displayAmountB: string;
}

export default function AddLiquidity() {
  const dai = useDaiToken();
  const wbtc = useWbtcToken();
  const { daiPoolLiquidity, wbtcPoolLiquidity, refetchAll: refetchCpamm } = useCpamm();
  const [poolState, setPoolState] = useState<PoolState>({
    tokenA: DAI_TOKEN,
    tokenB: WBTC_TOKEN,
    amountA: 0n,
    amountB: 0n,
    displayAmountA: "",
    displayAmountB: "",
  });
  const { writeContractAsync } = useWriteContract();
  const { value: isAddingLiquidity, setValue: setIsAddingLiquidity } = useBoolean(false);

  const tokenABalance = poolState.tokenA.symbol === DAI_TOKEN.symbol ? dai.balance : wbtc.balance;
  const tokenBBalance = poolState.tokenB.symbol === DAI_TOKEN.symbol ? dai.balance : wbtc.balance;

  const handleTokenSelect = (value: string, tokenType: "tokenA" | "tokenB") => {
    const selected = value === DAI_TOKEN.symbol ? DAI_TOKEN : WBTC_TOKEN;
    const nonSelected = selected === DAI_TOKEN ? WBTC_TOKEN : DAI_TOKEN;
    const otherTokenType = tokenType === "tokenA" ? "tokenB" : "tokenA";

    setPoolState(prev => ({
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
    const newDisplayAmount = e.target.value;

    // If input is empty, reset both amounts
    if (!newDisplayAmount) {
      setPoolState(prev => ({
        ...prev,
        amountA: 0n,
        amountB: 0n,
        displayAmountA: "",
        displayAmountB: "",
      }));
      return;
    }

    try {
      const newAmount = parseUnits(newDisplayAmount.replace(/,/g, ""), 18);
      const reserve0 = daiPoolLiquidity ?? 0n;
      const reserve1 = wbtcPoolLiquidity ?? 0n;

      // If pool is empty, allow any ratio
      if (reserve0 === 0n || reserve1 === 0n) {
        setPoolState(prev => ({
          ...prev,
          [tokenType === "tokenA" ? "amountA" : "amountB"]: newAmount,
          [tokenType === "tokenA" ? "displayAmountA" : "displayAmountB"]: newDisplayAmount,
        }));
        return;
      }

      // Calculate the other amount based on the constant product formula
      const isTokenADai = poolState.tokenA.symbol === "DAI";
      let calculatedAmount: bigint;

      if ((tokenType === "tokenA" && isTokenADai) || (tokenType === "tokenB" && !isTokenADai)) {
        calculatedAmount = (newAmount * reserve1) / reserve0;
      } else {
        calculatedAmount = (newAmount * reserve0) / reserve1;
      }

      setPoolState(prev => ({
        ...prev,
        [tokenType === "tokenA" ? "amountA" : "amountB"]: newAmount,
        [tokenType === "tokenA" ? "amountB" : "amountA"]: calculatedAmount,
        [tokenType === "tokenA" ? "displayAmountA" : "displayAmountB"]: newDisplayAmount,
        [tokenType === "tokenA" ? "displayAmountB" : "displayAmountA"]: formatTokenWithDecimals(calculatedAmount, 18),
      }));
    } catch (error) {
      console.error("Error calculating amounts:", error);
    }
  };

  const handleAddLiquidity = async () => {
    if (poolState.amountA === 0n || poolState.amountB === 0n) {
      return;
    }

    setIsAddingLiquidity(true);

    const tokenA = poolState.tokenA.symbol === "DAI" ? dai : wbtc;
    const tokenB = poolState.tokenB.symbol === "DAI" ? dai : wbtc;

    try {
      // Check allowances for both tokens
      if ((tokenA.allowance ?? 0n) < poolState.amountA) {
        const approveTokenA = await toast.promise(tokenA.approve(poolState.amountA), {
          loading: `Approving ${poolState.tokenA.symbol}...`,
          success: `${poolState.tokenA.symbol} approved!`,
          error: err => {
            console.error(err);
            return `Failed to approve ${poolState.tokenA.symbol}`;
          },
        });
        await toast.promise(waitForTransactionReceipt({ hash: approveTokenA }), {
          loading: `Waiting for ${poolState.tokenA.symbol} approval confirmation...`,
          success: `${poolState.tokenA.symbol} approval confirmed!`,
          error: err => {
            console.error(err);
            return `Failed to approve ${poolState.tokenA.symbol}`;
          },
        });
      }

      if ((tokenB.allowance ?? 0n) < poolState.amountB) {
        const approveTokenB = await toast.promise(tokenB.approve(poolState.amountB), {
          loading: `Approving ${poolState.tokenB.symbol}...`,
          success: `${poolState.tokenB.symbol} approved!`,
          error: err => {
            console.error(err);
            return `Failed to approve ${poolState.tokenB.symbol}`;
          },
        });
        await toast.promise(waitForTransactionReceipt({ hash: approveTokenB }), {
          loading: `Waiting for ${poolState.tokenB.symbol} approval confirmation...`,
          success: `${poolState.tokenB.symbol} approval confirmed!`,
          error: err => {
            console.error(err);
            return `Failed to approve ${poolState.tokenB.symbol}`;
          },
        });
      }

      // Add liquidity using the actual BigInt values
      const addLiquidity = await toast.promise(
        writeContractAsync({
          abi: CPAMM_ABI,
          address: CPAMM_ADDRESS,
          functionName: "addLiquidity",
          args: [poolState.amountA, poolState.amountB],
        }),
        {
          loading: "Adding liquidity...",
          success: "Liquidity added successfully!",
          error: err => {
            console.error(err);
            return "Failed to add liquidity";
          },
        },
      );

      await toast.promise(waitForTransactionReceipt({ hash: addLiquidity }), {
        loading: "Waiting for liquidity confirmation...",
        success: "Liquidity confirmed!",
        error: err => {
          console.error(err);
          return "Failed to add liquidity";
        },
      });

      // Reset everything
      setPoolState(prev => ({
        ...prev,
        amountA: 0n,
        amountB: 0n,
        displayAmountA: "",
        displayAmountB: "",
      }));
    } finally {
      dai.refetchAll();
      wbtc.refetchAll();
      refetchCpamm();
      setIsAddingLiquidity(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative">
      <div className="flex flex-col">
        <h2 className="mb-4 font-medium text-2xl">Add Liquidity</h2>
        <Link href="/pool">
          <Button variant="secondary" className="w-fit mb-6">
            <AdjustmentsHorizontalIcon className="h-4 w-4" />
            My Positions
          </Button>
        </Link>

        <HiddenContent>
          <div className="card min-w-[450px]">
            <div>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleAddLiquidity();
                }}
              >
                <PoolCard
                  heading="Token 1"
                  balance={tokenABalance ?? 0n}
                  displayAmount={poolState.displayAmountA}
                  token={poolState.tokenA}
                  selectedToken={poolState.tokenA.symbol}
                  onAmountChange={e => handleAmountChange(e, "tokenA")}
                  onTokenChange={e => handleTokenSelect(e, "tokenA")}
                  disabled={isAddingLiquidity}
                />

                <PlusCircleIcon className="h-7 w-7 my-4 mx-auto text-muted-foreground" />

                <PoolCard
                  heading="Token 2"
                  balance={tokenBBalance ?? 0n}
                  displayAmount={poolState.displayAmountB}
                  token={poolState.tokenB}
                  selectedToken={poolState.tokenB.symbol}
                  onAmountChange={e => handleAmountChange(e, "tokenB")}
                  onTokenChange={e => handleTokenSelect(e, "tokenB")}
                  disabled={isAddingLiquidity}
                />

                <Button
                  type="submit"
                  className="w-full mt-6 h-11"
                  disabled={!poolState.amountA || !poolState.amountB}
                  loading={isAddingLiquidity}
                >
                  Add Liquidity
                </Button>
              </form>
            </div>
          </div>
        </HiddenContent>
      </div>
    </div>
  );
}

function PoolCard({
  heading,
  balance,
  onAmountChange,
  onTokenChange,
  disabled,
  displayAmount,
  token,
  selectedToken,
}: {
  heading: string;
  balance: bigint;
  displayAmount: string;
  token: Token;
  onAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedToken: Token["symbol"];
  onTokenChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <Card>
      <CardHeader className="p-4 pb-3">
        <CardTitle className="text-muted-foreground text-sm font-normal">{heading}</CardTitle>
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
                <SelectItem value="DAI">
                  <div className="flex items-center gap-x-2 mr-2">
                    <Image src={DAI_TOKEN.logo} alt={DAI_TOKEN.symbol} width={20} height={20} />
                    {DAI_TOKEN.symbol}
                  </div>
                </SelectItem>
                <SelectItem value="WBTC">
                  <div className="flex items-center gap-x-2 mr-2">
                    <Image src={WBTC_TOKEN.logo} alt={WBTC_TOKEN.symbol} width={20} height={20} />
                    {WBTC_TOKEN.symbol}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-x-2 text-sm text-muted-foreground self-end">
          <WalletIcon className="h-4 w-4" />
          {formatTokenWithDecimals(balance, token.decimals)}
        </div>
      </CardContent>
    </Card>
  );
}
