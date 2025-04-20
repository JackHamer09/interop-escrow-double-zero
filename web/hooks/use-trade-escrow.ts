import { useCallback, useEffect } from "react";
import useTradeEscrowInterop from "./use-trade-escrow-interop";
import { Address } from "viem";
import { useAccount, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
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
  partyBChainId: bigint;
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
  const { address, chainId: walletChainId } = useAccount();
  const interop = useTradeEscrowInterop();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();

  async function switchChainIfNotSet(chainId: number) {
    if (walletChainId !== chainId) {
      await switchChainAsync({ chainId });
    }
  }

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

  const findTrade = (tradeId: bigint) => {
    const trade = myTrades?.find(trade => trade.tradeId === tradeId);
    if (!trade) throw new Error("Trade wasn't found");
    const myExpectedChainId = trade.partyA === address ? BigInt(chain1.id) : trade.partyBChainId;
    return { ...trade, myExpectedChainId };
  };

  const proposeTradeAsync = async (
    partyB: Address,
    partyBChainId: number,
    tokenA: Address,
    amountA: bigint,
    tokenB: Address,
    amountB: bigint,
  ) => {
    await switchChainIfNotSet(chain1.id);
    return await writeContractAsync({
      ...options,
      functionName: "proposeTrade",
      args: [partyB, BigInt(partyBChainId), tokenA, amountA, tokenB, amountB],
    });
  }

  const cancelTradeAsync = async (tradeId: bigint) => {
    const trade = findTrade(tradeId);
    await switchChainIfNotSet(Number(trade.myExpectedChainId));
    if (trade.myExpectedChainId === BigInt(chain1.id)) {
      return await writeContractAsync({
        ...options,
        functionName: "cancelTrade",
        args: [tradeId],
      });
    } else {
      return await interop.cancelTradeAsync(tradeId);
    }
  }

  const acceptTradeAsync = async (tradeId: bigint) => {
    const trade = findTrade(tradeId);
    await switchChainIfNotSet(Number(trade.myExpectedChainId));
    if (trade.myExpectedChainId === BigInt(chain1.id)) {
      return await writeContractAsync({
        ...options,
        chainId: chain1.id,
        functionName: "acceptTrade",
        args: [tradeId],
      });
    } else {
      return await interop.acceptTradeAsync(tradeId);
    }
  };

  const depositTradeAsync = async (tradeId: bigint) => {
    const trade = findTrade(tradeId);
    await switchChainIfNotSet(Number(trade.myExpectedChainId));
    if (trade.myExpectedChainId === BigInt(chain1.id)) {
      return await writeContractAsync({
        ...options,
        functionName: "deposit",
        args: [tradeId],
      });
    } else {
      return await interop.depositTradeAsync(tradeId, trade.tokenB, trade.amountB);
    }
  }

  return {
    myTrades,
    refetchAll,
    proposeTradeAsync,
    cancelTradeAsync,
    acceptTradeAsync,
    depositTradeAsync,
  };
}
