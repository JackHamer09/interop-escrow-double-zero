"use client";

import { Address, formatEther } from "viem";
import { useWatchBalance } from "~~/hooks/use-watch-balance";

type BalanceProps = {
  address?: Address;
  className?: string;
};

/**
 * Display (ETH & USD) balance of an ETH address.
 */
export const Balance = ({ address, className = "" }: BalanceProps) => {
  const {
    data: balance,
    isError,
    error,
    isLoading,
  } = useWatchBalance({
    address,
  });

  if (isLoading) return <div className="text-xs">Loading...</div>;
  if (isError) return <div className="text-xs">Error: {error.message}</div>;

  const formattedBalance = balance ? Number(formatEther(balance.value)) : 0;

  return (
    <div className={`w-full flex items-center justify-center font-normal ${className}`}>
      <>
        <span>{formattedBalance.toFixed(4)}</span>
        <span className="text-[0.8em] font-bold ml-1">ETH</span>
      </>
    </div>
  );
};
