import { options } from "./use-trade-escrow";
import { Address } from "viem";
import { useAccount, useWriteContract } from "wagmi";
import { chain1 } from "~~/services/web3/wagmiConfig";

export default function useTradeEscrowInterop() {
  const { address, chainId } = useAccount();
  const { writeContractAsync } = useWriteContract();

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
    return writeContractAsync({
      ...options,
      chainId: chain1.id,
      functionName: "acceptTrade",
      args: [tradeId],
    });
  };

  const depositTradeAsync = (tradeId: bigint) =>
    writeContractAsync({
      ...options,
      functionName: "deposit",
      args: [tradeId],
    });

  return {
    proposeTradeAsync,
    cancelTradeAsync,
    acceptTradeAsync,
    depositTradeAsync,
  };
}
