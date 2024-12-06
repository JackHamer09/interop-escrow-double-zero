"use client";

import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useBoolean } from "usehooks-ts";
import { parseUnits } from "viem";
import { formatEther } from "viem";
import { useAccount, useWriteContract } from "wagmi";
import { ArrowsUpDownIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { CPAMM_ABI, CPAMM_ADDRESS } from "~~/contracts/cpamm";
import { DAI_TOKEN, ERC20_ABI, WBTC_TOKEN } from "~~/contracts/tokens";
import useCpamm from "~~/hooks/use-cpamm";
import useDaiToken from "~~/hooks/use-dai-token";
import useWbtcToken from "~~/hooks/use-wbtc-token";
import { cn } from "~~/utils/cn";
import { formatTokenWithDecimals } from "~~/utils/currency";
import waitForTransactionReceipt from "~~/utils/wait-for-transaction";

export default function UniswapClone() {
  const dai = useDaiToken();
  const wbtc = useWbtcToken();
  const { writeContractAsync } = useWriteContract();
  const { daiPoolLiquidity, wbtcPoolLiquidity, refetchAll } = useCpamm();
  const { isConnected } = useAccount();
  const { value: isSwapping, setValue: setIsSwapping } = useBoolean(false);
  const [swapState, setSwapState] = useState({
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

  useEffect(() => {
    const interval = setInterval(() => {
      refetchAll();
    }, 5000);
    return () => clearInterval(interval);
  }, [refetchAll]);

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
      const newAmount = parseUnits(newDisplayAmount, 18);
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
          displayAmount: formatEther(oppositeAmount),
        },
      }));
    } catch (error) {
      console.error("Error calculating amounts:", error);
    }
  };

  const handleTokenChange = (e: React.ChangeEvent<HTMLSelectElement>, tokenType: "from" | "to") => {
    const newToken = e.target.value === "DAI" ? DAI_TOKEN : WBTC_TOKEN;
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
    if (!swapState.from.amount || !swapState.to.amount || !fromAllowance) {
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
    <div className="flex-1 flex items-center justify-center relative">
      <div className="card min-w-[450px] shadow-lg bg-white">
        <form
          className={cn("card-body", !isConnected && "opacity-60")}
          onSubmit={e => {
            e.preventDefault();
            handleSwap();
          }}
        >
          <h2 className="card-title mb-4 font-medium text-2xl">Swap Tokens</h2>
          <div className="form-control gap-2">
            <label className="label">
              <span className="label-text text-lg">From</span>
              <span className="label-text-alt">
                Balance: {formatTokenWithDecimals(fromBalance ?? 0n, 18)} {swapState.from.token.symbol}
              </span>
            </label>
            <select
              className="select select-bordered"
              value={swapState.from.token.symbol}
              onChange={e => handleTokenChange(e, "from")}
              disabled={isSwapping}
            >
              <option key="DAI" value="DAI">
                {DAI_TOKEN.name} ({DAI_TOKEN.symbol})
              </option>
              <option key="WBTC" value="WBTC">
                {WBTC_TOKEN.name} ({WBTC_TOKEN.symbol})
              </option>
            </select>
            <input
              type="number"
              step="any"
              placeholder="0"
              className="input input-bordered"
              min={0}
              value={swapState.from.displayAmount}
              onChange={e => handleAmountChange(e, "from")}
              disabled={isSwapping}
            />
          </div>

          <div className="flex justify-center my-2">
            <button className="btn btn-outline" onClick={handleSwitch} disabled={isSwapping} type="button">
              <ArrowsUpDownIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="form-control gap-2">
            <label className="label">
              <span className="label-text text-lg">To</span>
              <span className="label-text-alt">
                Balance: {formatTokenWithDecimals(toBalance ?? 0n, 18)} {swapState.to.token.symbol}
              </span>
            </label>
            <select
              className="select select-bordered"
              value={swapState.to.token.symbol}
              onChange={e => handleTokenChange(e, "to")}
              disabled={isSwapping}
            >
              <option key="DAI" value="DAI">
                {DAI_TOKEN.name} ({DAI_TOKEN.symbol})
              </option>
              <option key="WBTC" value="WBTC">
                {WBTC_TOKEN.name} ({WBTC_TOKEN.symbol})
              </option>
            </select>
            <input
              type="number"
              step="any"
              placeholder="0"
              className="input input-bordered"
              value={swapState.to.displayAmount}
              onChange={e => handleAmountChange(e, "to")}
              disabled={isSwapping}
            />
          </div>

          <div className="mt-4 text-sm">
            <p>
              Swap Price: 1 {swapState.from.token.symbol} = {formatTokenWithDecimals(swapPrice, 18)}{" "}
              {swapState.to.token.symbol}
            </p>
          </div>

          <div className="card-actions justify-end mt-6">
            <button
              className="btn btn-primary"
              type="submit"
              disabled={!swapState.from.amount || !swapState.to.amount || isSwapping}
            >
              Swap
            </button>
          </div>
        </form>
      </div>
      {!isConnected && (
        <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm rounded-lg">
          <div className="rounded-lg bg-neutral-800 border px-6 py-4 text-lg font-medium text-neutral-50 shadow-lg flex items-center gap-x-2">
            <LockClosedIcon className="w-5 h-5" />
            Connect your wallet to start
          </div>
        </div>
      )}
    </div>
  );
}
