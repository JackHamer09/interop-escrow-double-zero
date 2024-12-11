"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { ChevronDownIcon, GithubIcon, LockIcon, ShieldIcon } from "lucide-react";
import toast from "react-hot-toast";
import { useBoolean } from "usehooks-ts";
import { parseUnits } from "viem";
import { useWriteContract } from "wagmi";
import { ArrowsUpDownIcon, WalletIcon } from "@heroicons/react/24/outline";
import { Footer } from "~~/components/Footer";
import HiddenContent from "~~/components/HiddenContent";
import { Button } from "~~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~~/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~~/components/ui/select";
import { CPAMM_ABI, CPAMM_ADDRESS } from "~~/contracts/cpamm";
import { DAI_TOKEN, ERC20_ABI, Token, WBTC_TOKEN } from "~~/contracts/tokens";
import useCpamm from "~~/hooks/use-cpamm";
import useDaiToken from "~~/hooks/use-dai-token";
import useWbtcToken from "~~/hooks/use-wbtc-token";
import { cn } from "~~/utils/cn";
import { formatTokenWithDecimals } from "~~/utils/currency";
import waitForTransactionReceipt from "~~/utils/wait-for-transaction";

interface SwapState {
  from: {
    token: Token;
    amount: bigint;
    displayAmount: string;
  };
  to: {
    token: Token;
    amount: bigint;
    displayAmount: string;
  };
}

export default function UniswapClone() {
  const dai = useDaiToken();
  const wbtc = useWbtcToken();
  const { writeContractAsync } = useWriteContract();
  const { daiPoolLiquidity, wbtcPoolLiquidity } = useCpamm();
  const { value: isSwapping, setValue: setIsSwapping } = useBoolean(false);
  const [swapState, setSwapState] = useState<SwapState>({
    from: {
      token: DAI_TOKEN,
      amount: 0n,
      displayAmount: "",
    },
    to: {
      token: WBTC_TOKEN,
      amount: 0n,
      displayAmount: "",
    },
  });

  const fromBalance = swapState.from.token.symbol === "DAI" ? dai.balance : wbtc.balance;
  const toBalance = swapState.to.token.symbol === "DAI" ? dai.balance : wbtc.balance;

  const fromAllowance = swapState.from.token.symbol === "DAI" ? dai.allowance : wbtc.allowance;

  const swapPrice = useMemo(() => {
    if (!daiPoolLiquidity || !wbtcPoolLiquidity) {
      return 0n;
    }
    const mockAmountIn = 1n * 10n ** 18n;
    const mockAmountInWithFee = (mockAmountIn * 997n) / 1000n; // 0.3% fee
    const reserveIn = swapState.from.token.symbol === "DAI" ? daiPoolLiquidity : wbtcPoolLiquidity;
    const reserveOut = swapState.to.token.symbol === "DAI" ? daiPoolLiquidity : wbtcPoolLiquidity;
    return (reserveOut * mockAmountInWithFee) / (reserveIn + mockAmountInWithFee);
  }, [daiPoolLiquidity, swapState.from.token.symbol, swapState.to.token.symbol, wbtcPoolLiquidity]);

  const handleAmountChange = async (e: React.ChangeEvent<HTMLInputElement>, tokenType: "from" | "to") => {
    if (!daiPoolLiquidity || !wbtcPoolLiquidity) {
      return;
    }

    const newDisplayAmount = e.target.value;

    // If input is empty, reset both amounts
    if (!newDisplayAmount) {
      setSwapState(prev => ({
        from: {
          ...prev.from,
          amount: 0n,
          displayAmount: "",
        },
        to: {
          ...prev.to,
          amount: 0n,
          displayAmount: "",
        },
      }));
      return;
    }

    try {
      let newAmount: bigint;
      try {
        newAmount = parseUnits(newDisplayAmount, 18);
      } catch {
        // Invalid input, do nothing
        return;
      }
      const newAmountWithFee = (newAmount * 997n) / 1000n; // 0.3% fee

      const oppositeAmount = (() => {
        if (tokenType === "from") {
          const reserveIn = swapState.from.token.symbol === "DAI" ? daiPoolLiquidity : wbtcPoolLiquidity;
          const reserveOut = swapState.to.token.symbol === "DAI" ? daiPoolLiquidity : wbtcPoolLiquidity;
          return (reserveOut * newAmountWithFee) / (reserveIn + newAmountWithFee);
        } else {
          // For "to" direction, swap the reserves
          const reserveIn = swapState.to.token.symbol === "DAI" ? daiPoolLiquidity : wbtcPoolLiquidity;
          const reserveOut = swapState.from.token.symbol === "DAI" ? daiPoolLiquidity : wbtcPoolLiquidity;
          return (reserveOut * newAmountWithFee) / (reserveIn + newAmountWithFee);
        }
      })();

      const oppositeTokenType = tokenType === "from" ? "to" : "from";

      setSwapState(prev => ({
        ...prev,
        [tokenType]: {
          ...prev[tokenType],
          amount: newAmount,
          displayAmount: newDisplayAmount,
        },
        [oppositeTokenType]: {
          ...prev[oppositeTokenType],
          amount: oppositeAmount,
          displayAmount: formatTokenWithDecimals(oppositeAmount, 18),
        },
      }));
    } catch (error) {
      console.error("Error calculating amounts:", error);
    }
  };

  const handleTokenChange = (value: string, tokenType: "from" | "to") => {
    const newToken = value === "DAI" ? DAI_TOKEN : WBTC_TOKEN;
    if (swapState[tokenType].token.symbol === newToken.symbol) {
      return;
    }

    const oppositeTokenType = tokenType === "from" ? "to" : "from";

    setSwapState(prev => ({
      ...prev,
      [tokenType]: {
        ...prev[oppositeTokenType],
      },
      [oppositeTokenType]: {
        ...prev[tokenType],
      },
    }));
  };

  const handleSwitch = () => {
    setSwapState(prev => ({
      ...prev,
      from: { ...prev.to },
      to: { ...prev.from },
    }));
  };

  const handleSwap = async () => {
    if (!swapState.from.amount || !swapState.to.amount || fromAllowance === undefined) {
      return;
    }

    setIsSwapping(true);

    try {
      if (fromAllowance < swapState.from.amount) {
        const approveTx = await toast.promise(
          writeContractAsync({
            abi: ERC20_ABI,
            address: swapState.from.token.address,
            functionName: "approve",
            args: [CPAMM_ADDRESS, swapState.from.amount],
          }),
          {
            loading: `Approving ${swapState.from.token.symbol}...`,
            success: `${swapState.from.token.symbol} approved!`,
            error: err => {
              console.error(err);
              return `Failed to approve ${swapState.from.token.symbol}`;
            },
          },
        );

        await toast.promise(
          waitForTransactionReceipt({
            hash: approveTx,
          }),
          {
            loading: `Waiting for ${swapState.from.token.symbol} approval confirmation...`,
            success: `${swapState.from.token.symbol} approval confirmed!`,
            error: err => {
              console.error(err);
              return `Failed to approve ${swapState.from.token.symbol}`;
            },
          },
        );
      }

      const swapTx = await toast.promise(
        writeContractAsync({
          abi: CPAMM_ABI,
          address: CPAMM_ADDRESS,
          functionName: "swap",
          args: [swapState.from.token.address, swapState.from.amount],
        }),
        {
          loading: `Swapping ${swapState.from.displayAmount} ${swapState.from.token.symbol}...`,
          success: "Swap successful!",
          error: err => {
            console.error(err);
            return `Failed to swap ${swapState.from.displayAmount} ${swapState.from.token.symbol}`;
          },
        },
      );

      await toast.promise(waitForTransactionReceipt({ hash: swapTx }), {
        loading: `Waiting for swap confirmation...`,
        success: "Swap confirmed!",
        error: err => {
          console.error(err);
          return `Failed to swap ${swapState.from.displayAmount} ${swapState.from.token.symbol}`;
        },
      });

      // Reset everything
      setSwapState(prev => ({
        from: { ...prev.from, amount: 0n, displayAmount: "" },
        to: { ...prev.to, amount: 0n, displayAmount: "" },
      }));
    } finally {
      setIsSwapping(false);
      dai.refetchAll();
      wbtc.refetchAll();
    }
  };

  return (
    <div className="flex-1 flex relative pt-14 flex-col">
      <div className="flex flex-col justify-between items-center h-[calc(100vh-74px-56px)]">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSwap();
          }}
        >
          <h1 className="text-6xl text-center mb-8 leading-[4rem]">
            Private swaps,
            <br />
            anytime.
          </h1>

          <HiddenContent>
            <>
              <SwapCard
                heading="Sell"
                balance={fromBalance ?? 0n}
                displayAmount={swapState.from.displayAmount}
                token={swapState.from.token}
                selectedToken={swapState.from.token.symbol}
                onAmountChange={e => handleAmountChange(e, "from")}
                onTokenChange={e => handleTokenChange(e, "from")}
                disabled={isSwapping}
                daiPoolLiquidity={daiPoolLiquidity}
                wbtcPoolLiquidity={wbtcPoolLiquidity}
              />

              <div className="flex justify-center -my-3">
                <Button
                  variant="secondary"
                  className="h-10 w-10"
                  onClick={handleSwitch}
                  disabled={isSwapping}
                  type="button"
                >
                  <ArrowsUpDownIcon className="h-5 w-5" />
                </Button>
              </div>

              <SwapCard
                heading="Buy"
                balance={toBalance ?? 0n}
                displayAmount={swapState.to.displayAmount}
                token={swapState.to.token}
                selectedToken={swapState.to.token.symbol}
                onAmountChange={e => handleAmountChange(e, "to")}
                onTokenChange={e => handleTokenChange(e, "to")}
                disabled={isSwapping}
                daiPoolLiquidity={daiPoolLiquidity}
                wbtcPoolLiquidity={wbtcPoolLiquidity}
              />

              <div className="mt-4 text-sm text-muted-foreground">
                1 {swapState.from.token.symbol} = {formatTokenWithDecimals(swapPrice, 18)} {swapState.to.token.symbol}
              </div>

              <Button
                className="w-full h-11 mt-4 text-lg"
                type="submit"
                disabled={!swapState.from.amount || !swapState.to.amount}
                loading={isSwapping}
              >
                Swap
              </Button>
            </>
          </HiddenContent>
        </form>

        <div className="flex flex-col items-center justify-center py-6 gap-1 text-muted-foreground">
          <div>Scroll to learn more</div>
          <ChevronDownIcon className="h-5 w-5" />
        </div>
      </div>

      <div className="flex flex-col gap-y-4 min-h-screen pt-10 max-w-7xl mx-auto">
        <section className="p-8 flex flex-col gap-y-10">
          <h2 className="text-4xl md:text-5xl font-medium tracking-tight">What makes Double Zero swap unique?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FeatureCard
              title="Privacy"
              description="Swap information can only be accessed through authentication."
              icon={<ShieldIcon className="h-7 w-7" />}
              className="bg-blue-500/10 text-blue-400 min-h-[250px]"
            />
            <FeatureCard
              title="Permissioned swaps"
              description="All requests are verified by the chain permisison system."
              icon={<LockIcon className="h-7 w-7" />}
              className="bg-purple-500/10 text-purple-500"
            />
          </div>
        </section>
        <section className="p-8 flex flex-col gap-y-10">
          <h2 className="text-4xl md:text-5xl font-medium tracking-tight">How it works?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FlowStep
              number="1"
              title="Initiate Swap"
              description="Authenticated user initiates a swap between ERC20 permissioned tokens."
            />
            <FlowStep
              number="2"
              title="Verify Permission"
              description="Proxy verifies authentication and user permission, handling access control features."
            />
            <FlowStep number="3" title="Confirm Swap" description="Swap is confirmed in Double Zero Validium chain." />
          </div>
        </section>
        <section className="p-8 flex flex-col gap-y-10">
          <h2 className="text-4xl md:text-5xl font-medium tracking-tight">Learn more</h2>
          <ul className="list-disc pl-3 space-y-4 text-lg">
            <li className="flex items-center gap-x-3">
              <div className="bg-pink-500/10 rounded-full p-2">
                <GithubIcon className="h-5 w-5 text-pink-400" />
              </div>
              <a
                className="font-semibold underline underline-offset-4"
                href="https://github.com/Moonsong-Labs/double-zero-dapp"
              >
                Double Zero Dapp
              </a>{" "}
              <span className="text-muted-foreground">
                - Interact with the Double Zero ecosystem through our decentralized application.
              </span>
            </li>
            <li className="flex flex-col gap-y-2">
              <div className="flex items-center gap-x-3">
                <div className="bg-pink-500/10 rounded-full p-2">
                  <GithubIcon className="h-5 w-5 text-pink-400" />
                </div>
                <a
                  className="font-semibold underline underline-offset-4"
                  href="https://github.com/Moonsong-Labs/double-zero"
                >
                  Double Zero Block Explorer
                </a>{" "}
                <span className="text-muted-foreground">
                  - Explore the Double Zero blockchain with our intuitive block explorer.
                </span>
              </div>
            </li>
          </ul>
        </section>

        <Footer className="mt-auto" />
      </div>
    </div>
  );
}

function SwapCard({
  heading,
  balance,
  onAmountChange,
  onTokenChange,
  disabled,
  displayAmount,
  token,
  selectedToken,
  daiPoolLiquidity,
  wbtcPoolLiquidity,
}: {
  heading: string;
  balance: bigint;
  displayAmount: string;
  token: Token;
  onAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedToken: Token["symbol"];
  onTokenChange: (value: string) => void;
  disabled: boolean;
  daiPoolLiquidity: bigint | undefined;
  wbtcPoolLiquidity: bigint | undefined;
}) {
  return (
    <Card>
      <CardHeader className="p-4 pb-3">
        <CardTitle className="text-muted-foreground text-sm font-normal">{heading}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-y-2 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div className="flex flex-col flex-1">
            <input
              placeholder={!daiPoolLiquidity || !wbtcPoolLiquidity ? "-" : "0"}
              className={cn("bg-transparent appearance-none focus:outline-none text-3xl", disabled && "opacity-50")}
              value={displayAmount}
              onChange={onAmountChange}
              disabled={disabled || !daiPoolLiquidity || !wbtcPoolLiquidity}
            />
            {!daiPoolLiquidity || !wbtcPoolLiquidity ? (
              <span className="text-sm text-red-600">No liquidity available in pool</span>
            ) : null}
          </div>
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

function FeatureCard({
  title,
  description,
  icon,
  className,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("border-none rounded-3xl justify-between flex flex-col", className)}>
      <CardHeader>
        <div className="flex items-center gap-x-2 bg-background w-fit py-3 px-4 rounded-3xl">
          {icon}
          <span className="text-2xl">{title}</span>
        </div>
      </CardHeader>
      <CardContent className="text-xl pb-8 w-2/3">{description}</CardContent>
    </Card>
  );
}

function FlowStep({
  number,
  title,
  description,
  className,
}: {
  number: string;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div className={cn("flex-1 p-6 rounded-3xl relative bg-neutral-200/10 text-neutral-300", className)}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-background rounded-full flex items-center justify-center text-xl font-bold">
          {number}
        </div>
        <h3 className="text-xl font-semibold">{title}</h3>
      </div>
      <p className="text-lg opacity-90">{description}</p>
    </div>
  );
}
