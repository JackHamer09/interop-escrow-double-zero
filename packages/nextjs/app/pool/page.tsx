"use client";

import React, { useState } from "react";
import toast from "react-hot-toast";
import { useBoolean } from "usehooks-ts";
import { formatEther, parseUnits } from "viem";
import { useAccount, useWriteContract } from "wagmi";
import { LockClosedIcon } from "@heroicons/react/24/outline";
import { CPAMM_ABI, CPAMM_ADDRESS } from "~~/contracts/cpamm";
import { DAI_TOKEN, WBTC_TOKEN } from "~~/contracts/tokens";
import useCpamm from "~~/hooks/use-cpamm";
import useDaiToken from "~~/hooks/use-dai-token";
import useWbtcToken from "~~/hooks/use-wbtc-token";
import { cn } from "~~/utils/cn";
import { formatTokenWithDecimals } from "~~/utils/currency";
import waitForTransactionReceipt from "~~/utils/wait-for-transaction";

interface Token {
  symbol: string;
  name: string;
  address: string;
}

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
  const { isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { value: isAddingLiquidity, setValue: setIsAddingLiquidity } = useBoolean(false);

  const tokenABalance = poolState.tokenA.symbol === DAI_TOKEN.symbol ? dai.balance : wbtc.balance;
  const tokenBBalance = poolState.tokenB.symbol === DAI_TOKEN.symbol ? dai.balance : wbtc.balance;

  const handleTokenSelect = (e: React.ChangeEvent<HTMLSelectElement>, tokenType: "tokenA" | "tokenB") => {
    const selected = e.target.value === DAI_TOKEN.symbol ? DAI_TOKEN : WBTC_TOKEN;
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
      const newAmount = parseUnits(newDisplayAmount, 18);
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
        [tokenType === "tokenA" ? "displayAmountB" : "displayAmountA"]: formatEther(calculatedAmount),
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
    <div className="flex-1 flex items-center justify-center relative">
      <div className="card min-w-[450px] bg-white shadow-lg">
        <div className={cn("card-body", !isConnected && "opacity-60")}>
          <h2 className="card-title mb-4">Add Liquidity</h2>

          <form
            onSubmit={e => {
              e.preventDefault();
              handleAddLiquidity();
            }}
          >
            <div className="p-4 rounded-box mb-4 bg-neutral-200 border border-neutral-300">
              <h3 className="text-lg font-semibold mb-2">Current Pool Liquidity</h3>
              <p>{formatTokenWithDecimals(daiPoolLiquidity ?? 0n, 18)} DAI</p>
              <p>{formatTokenWithDecimals(wbtcPoolLiquidity ?? 0n, 18)} WBTC</p>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Token 1</span>
              </label>
              <select
                className="select select-bordered w-full"
                onChange={e => handleTokenSelect(e, "tokenA")}
                value={poolState.tokenA?.symbol || ""}
                disabled={isAddingLiquidity}
              >
                <option disabled value="">
                  Select token
                </option>
                <option key={DAI_TOKEN.symbol} value={DAI_TOKEN.symbol}>
                  {DAI_TOKEN.name} ({DAI_TOKEN.symbol})
                </option>
                <option key={WBTC_TOKEN.symbol} value={WBTC_TOKEN.symbol}>
                  {WBTC_TOKEN.name} ({WBTC_TOKEN.symbol})
                </option>
              </select>
            </div>

            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">Amount</span>
                <span className="label-text-alt">
                  Balance: {formatTokenWithDecimals(tokenABalance ?? 0n, 18)} {poolState.tokenA.symbol}
                </span>
              </label>
              <input
                type="number"
                step="any"
                placeholder="0"
                className="input input-bordered w-full"
                value={poolState.displayAmountA}
                onChange={e => handleAmountChange(e, "tokenA")}
                min={0}
                disabled={isAddingLiquidity}
              />
            </div>

            <div className="divider">AND</div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Token 2</span>
              </label>
              <select
                className="select select-bordered w-full"
                onChange={e => handleTokenSelect(e, "tokenB")}
                value={poolState.tokenB?.symbol || ""}
                disabled={isAddingLiquidity}
              >
                <option disabled value="">
                  Select token
                </option>
                <option key={DAI_TOKEN.symbol} value={DAI_TOKEN.symbol}>
                  {DAI_TOKEN.name} ({DAI_TOKEN.symbol})
                </option>
                <option key={WBTC_TOKEN.symbol} value={WBTC_TOKEN.symbol}>
                  {WBTC_TOKEN.name} ({WBTC_TOKEN.symbol})
                </option>
              </select>
            </div>

            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">Amount</span>
                <span className="label-text-alt">
                  Balance: {formatTokenWithDecimals(tokenBBalance ?? 0n, 18)} {poolState.tokenB.symbol}
                </span>
              </label>
              <input
                type="number"
                step="any"
                placeholder="0"
                className="input input-bordered w-full"
                value={poolState.displayAmountB}
                onChange={e => handleAmountChange(e, "tokenB")}
                min={0}
                disabled={isAddingLiquidity}
              />
            </div>

            <div className="card-actions justify-end mt-6">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!poolState.amountA || !poolState.amountB || isAddingLiquidity}
              >
                Add Liquidity
              </button>
            </div>
          </form>
        </div>

        {!isConnected && (
          <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm rounded-lg">
            <div className="rounded-lg bg-neutral-800 border px-6 py-4 text-lg font-medium text-neutral-50 shadow-lg flex items-center gap-x-2">
              <LockClosedIcon className="w-5 h-5" />
              Connect your wallet to add liquidity
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
