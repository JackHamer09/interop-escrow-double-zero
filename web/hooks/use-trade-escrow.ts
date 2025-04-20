import { useCallback, useEffect } from "react";
import { Address } from "viem";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { TRADE_ESCROW_ABI, TRADE_ESCROW_ADDRESS } from "~~/contracts/trade-escrow";
import { chain1 } from "~~/services/web3/wagmiConfig";

export const options = {
  address: TRADE_ESCROW_ADDRESS,
  abi: TRADE_ESCROW_ABI,
} as const;

export type EscrowTrade = {
  tradeId: bigint;
  partyA: string;
  partyB: string;
  tokenA: string;
  amountA: bigint;
  tokenB: string;
  amountB: bigint;
  depositedA: boolean;
  depositedB: boolean;
  status: EscrowTradeStatus;
};

export enum EscrowTradeStatus {
  PendingApproval = 0,
  PendingFunds = 1,
  Complete = 2,
  Declined = 3,
}

export default function useTradeEscrow() {
  const { address, chainId } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { data: myTrades, refetch: refetchMySwaps } = useReadContract({
    ...options,
    chainId: chain1.id,
    functionName: "getMySwaps",
    args: [address || "0x"],
  });

  const refetchAll = useCallback(() => {
    refetchMySwaps();
  }, [refetchMySwaps]);

  // Refetch all when the address changes
  useEffect(() => {
    refetchAll();
  }, [address, refetchAll]);

  const proposeTradeAsync = (
    partyB: Address,
    partyBChainId: number,
    tokenA: Address,
    amountA: bigint,
    tokenB: Address,
    amountB: bigint,
  ) =>
    writeContractAsync({
      ...options,
      functionName: "proposeTrade",
      args: [partyB, BigInt(partyBChainId.toString(16)), tokenA, amountA, tokenB, amountB],
    });

  const cancelTradeAsync = (tradeId: bigint) =>
    writeContractAsync({
      ...options,
      functionName: "cancelTrade",
      args: [tradeId],
    });

  const acceptTradeAsync = (tradeId: bigint) => {
    if (chainId === chain1.id) {
      return writeContractAsync({
        ...options,
        chainId: chain1.id,
        functionName: "acceptTrade",
        args: [tradeId],
      });
    } else {
      
    }
  }

  const depositTradeAsync = (tradeId: bigint) =>
    writeContractAsync({
      ...options,
      functionName: "deposit",
      args: [tradeId],
    });

  return {
    myTrades,
    refetchAll,
    proposeTradeAsync,
    cancelTradeAsync,
    acceptTradeAsync,
    depositTradeAsync,
  };
}
