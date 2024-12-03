"use client";

import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAccount, useWriteContract } from "wagmi";
import { ArrowsUpDownIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { CPAMM_ABI, CPAMM_ADDRESS } from "~~/contracts/cpamm";
import { DAI_TOKEN, ERC20_ABI, Token, WBTC_TOKEN } from "~~/contracts/tokens";
import useCpamm from "~~/hooks/use-cpamm";
import useDaiToken from "~~/hooks/use-dai-token";
import useWbtcToken from "~~/hooks/use-wbtc-token";
import { cn } from "~~/utils/cn";
import { formatTokenWithDecimals } from "~~/utils/currency";
import waitForTransactionReceipt from "~~/utils/wait-for-transaction-receipt";

export default function UniswapClone() {
  const [selectedToken, setSelectedToken] = useState<Token>(DAI_TOKEN);
  const [amount, setAmount] = useState("");
  const dai = useDaiToken();
  const wbtc = useWbtcToken();
  const { writeContractAsync } = useWriteContract();
  const { daiPoolLiquidity, wbtcPoolLiquidity, refetchAll } = useCpamm();
  const { isConnected } = useAccount();

  useEffect(() => {
    const interval = setInterval(() => {
      refetchAll();
    }, 5000);
    return () => clearInterval(interval);
  }, [refetchAll]);

  const swapAmount = useMemo(() => {
    if (!daiPoolLiquidity || !wbtcPoolLiquidity) {
      return 0n;
    }

    const amountWithFee = (BigInt(amount) * 10n ** 18n * 997n) / 1000n; // 0.3% fee
    const reserveIn = selectedToken.symbol === "DAI" ? daiPoolLiquidity : wbtcPoolLiquidity;
    const reserveOut = selectedToken.symbol === "DAI" ? wbtcPoolLiquidity : daiPoolLiquidity;
    return (reserveOut * amountWithFee) / (reserveIn + amountWithFee);
  }, [daiPoolLiquidity, wbtcPoolLiquidity, amount, selectedToken.symbol]);

  const swapPrice = useMemo(() => {
    if (!daiPoolLiquidity || !wbtcPoolLiquidity) {
      return 0n;
    }
    const mockAmountIn = 1n * 10n ** 18n;
    const mockAmountInWithFee = (mockAmountIn * 997n) / 1000n; // 0.3% fee
    const reserveIn = selectedToken.symbol === "DAI" ? daiPoolLiquidity : wbtcPoolLiquidity;
    const reserveOut = selectedToken.symbol === "DAI" ? wbtcPoolLiquidity : daiPoolLiquidity;
    return (reserveOut * mockAmountInWithFee) / (reserveIn + mockAmountInWithFee);
  }, [daiPoolLiquidity, wbtcPoolLiquidity, selectedToken.symbol]);

  const selectedTokenData = selectedToken.symbol === "DAI" ? dai : wbtc;
  const oppositeToken = selectedToken.symbol === "DAI" ? WBTC_TOKEN : DAI_TOKEN;
  const oppositeTokenData = oppositeToken.symbol === "DAI" ? dai : wbtc;
  const amountWithDecimals = BigInt(amount) * BigInt(10 ** 18);

  const handleTokenChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedToken(e.target.value === "DAI" ? DAI_TOKEN : WBTC_TOKEN);
    setAmount("");
  };

  const handleSwitch = () => {
    setSelectedToken(oppositeToken);
    setAmount("");
  };

  const handleSwap = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      return;
    }

    const allowance = selectedTokenData.allowance ?? 0n;

    if (allowance < amountWithDecimals) {
      const approveTx = await toast.promise(
        writeContractAsync({
          abi: ERC20_ABI,
          address: selectedToken.address,
          functionName: "approve",
          args: [CPAMM_ADDRESS, amountWithDecimals],
        }),
        {
          loading: `Approving ${selectedToken.symbol}...`,
          success: `${selectedToken.symbol} approved!`,
          error: err => {
            console.error(err);
            return `Failed to approve ${selectedToken.symbol}`;
          },
        },
      );

      await toast.promise(
        waitForTransactionReceipt({
          hash: approveTx,
        }),
        {
          loading: `Waiting for ${selectedToken.symbol} approval confirmation...`,
          success: `${selectedToken.symbol} approval confirmed!`,
          error: err => {
            console.error(err);
            return `Failed to approve ${selectedToken.symbol}`;
          },
        },
      );
    }

    const swapTx = await toast.promise(
      writeContractAsync({
        abi: CPAMM_ABI,
        address: CPAMM_ADDRESS,
        functionName: "swap",
        args: [selectedToken.address, amountWithDecimals],
      }),
      {
        loading: `Swapping ${amount} ${selectedToken.symbol}...`,
        success: "Swap successful!",
        error: err => {
          console.error(err);
          return `Failed to swap ${amount} ${selectedToken.symbol}`;
        },
      },
    );

    await toast.promise(waitForTransactionReceipt({ hash: swapTx }), {
      loading: `Waiting for swap confirmation...`,
      success: "Swap confirmed!",
      error: err => {
        console.error(err);
        return `Failed to swap ${amount} ${selectedToken.symbol}`;
      },
    });

    // Reset everything
    setAmount("");
    dai.refetchAll();
    wbtc.refetchAll();
  };

  return (
    <div className="flex-1 flex items-center justify-center relative">
      <div className="card min-w-[450px] shadow-lg bg-white">
        <div className={cn("card-body", !isConnected && "opacity-60")}>
          <h2 className="card-title mb-4 font-medium text-2xl">Swap Tokens</h2>
          <div className="form-control gap-2">
            <label className="label">
              <span className="label-text text-lg">From</span>
              <span className="label-text-alt">
                Balance: {formatTokenWithDecimals(selectedTokenData.balance ?? 0n, 18)} {selectedToken.symbol}
              </span>
            </label>
            <select className="select select-bordered" value={selectedToken.symbol} onChange={handleTokenChange}>
              <option key="DAI" value="DAI">
                {DAI_TOKEN.name} ({DAI_TOKEN.symbol})
              </option>
              <option key="WBTC" value="WBTC">
                {WBTC_TOKEN.name} ({WBTC_TOKEN.symbol})
              </option>
            </select>
            <input
              type="number"
              placeholder="0"
              className="input input-bordered"
              min={0}
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>

          <div className="flex justify-center my-2">
            <button className="btn btn-outline" onClick={handleSwitch}>
              <ArrowsUpDownIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="form-control gap-2">
            <label className="label">
              <span className="label-text text-lg">To</span>
              <span className="label-text-alt">
                Balance: {formatTokenWithDecimals(oppositeTokenData.balance ?? 0n, 18)} {oppositeToken.symbol}
              </span>
            </label>
            <select className="select select-bordered" value={oppositeToken.symbol} disabled>
              <option key="DAI" value="DAI">
                {DAI_TOKEN.name} ({DAI_TOKEN.symbol})
              </option>
              <option key="WBTC" value="WBTC">
                {WBTC_TOKEN.name} ({WBTC_TOKEN.symbol})
              </option>
            </select>
            <input
              type="number"
              placeholder="0.0"
              className="input input-bordered"
              value={formatTokenWithDecimals(swapAmount, 18)}
              disabled
            />
          </div>

          <div className="mt-4 text-sm">
            <p>
              Swap Price: 1 {selectedToken.symbol} = {formatTokenWithDecimals(swapPrice, 18)}{" "}
              {selectedToken.symbol === "DAI" ? "WBTC" : "DAI"}
            </p>
          </div>

          <div className="card-actions justify-end mt-6">
            <button className="btn btn-primary" onClick={handleSwap} disabled={!amount || parseFloat(amount) <= 0}>
              Swap
            </button>
          </div>
        </div>
      </div>
      {!isConnected && (
        <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm rounded-lg">
          <div className="rounded-lg bg-neutral-800 border px-6 py-4 text-lg font-medium text-neutral-50 shadow-lg flex items-center gap-x-2">
            <LockClosedIcon className="w-5 h-5" />
            Connect your wallet to swap
          </div>
        </div>
      )}
    </div>
  );
}
