import { type Address, encodeFunctionData, Hash, parseEther } from "viem";
import { useAccount } from "wagmi";
import { InteropTransactionBuilder } from "./use-interop-builder";
import { options } from "./use-trade-escrow";
import { ERC20_ABI, USDG_TOKEN, WAAPL_TOKEN } from "~~/contracts/tokens";
import { chain1, chain2 } from "~~/services/web3/wagmiConfig";

export default function useTradeEscrowInterop() {
  const { address } = useAccount();
  const feeAmount = parseEther("0.2");

  // TODO: can not propose from chain b
  // const proposeTradeAsync = async (
  //   partyB: Address,
  //   partyBChainId: number,
  //   tokenA: Address,
  //   amountA: bigint,
  //   tokenB: Address,
  //   amountB: bigint,
  // ) => {
  //   if (!address) throw new Error("No address available");
  //   const builder = new InteropTransactionBuilder(chain2.id, chain1.id, feeAmount, address);
  //   const data = encodeFunctionData({
  //     abi: options.abi,
  //     functionName: "proposeTrade",
  //     args: [partyB, BigInt(partyBChainId), tokenA, amountA, tokenB, amountB],
  //   });
  //   builder.addTransaction({ contractAddress: options.address, data, value: 0n });
  //   return await builder.send();
  // };

  const cancelTradeAsync = async (tradeId: bigint) => {
    if (!address) throw new Error("No address available");
    const builder = new InteropTransactionBuilder(chain2.id, chain1.id, feeAmount, address);
    const data = encodeFunctionData({
      abi: options.abi,
      functionName: "cancelTrade",
      args: [tradeId],
    });
    builder.addTransaction({ contractAddress: options.address, data, value: 0n });
    return await builder.send();
  };

  const acceptTradeAsync = async (tradeId: bigint) => {
    if (!address) throw new Error("No address available");
    const builder = new InteropTransactionBuilder(chain2.id, chain1.id, feeAmount, address);
    const data = encodeFunctionData({
      abi: options.abi,
      functionName: "acceptTrade",
      args: [tradeId],
    });
    builder.addTransaction({ contractAddress: options.address, data, value: 0n });
    return await builder.send();
  };

  const depositTradeAsync = async (tradeId: bigint, tokenAddress: Address, amount: bigint) => {
    if (!address) throw new Error("No address available");
    const builder = new InteropTransactionBuilder(chain2.id, chain1.id, parseEther("1"), address);

    const tokens = [USDG_TOKEN, WAAPL_TOKEN];
    const token = tokens.find(e => [e.address, e.address_chain2].includes(tokenAddress));
    if (!token) throw new Error("Token not found");

    // 1. Approve NativeTokenVault if needed
    await builder.approveNativeTokenVault(token.address_chain2, amount);

    const aliasAddress = await builder.getAliasedAddress(address);
    console.log("aliasAddress", aliasAddress);
    // 2. Transfer funds to aliased address
    builder.addTransfer({ assetId: token.assetId as Hash, amount, to: aliasAddress });

    // 3. Approve allowance for token at Chain1
    const approvalData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "approve",
      args: [options.address, amount],
    });
    builder.addTransaction({ contractAddress: token.address, data: approvalData, value: 0n });

    // 4. Deposit transaction
    const depositData = encodeFunctionData({
      abi: options.abi,
      functionName: "deposit",
      args: [tradeId],
    });
    builder.addTransaction({ contractAddress: options.address, data: depositData, value: 0n });

    return await builder.send();
  };

  return {
    cancelTradeAsync,
    acceptTradeAsync,
    depositTradeAsync,
  };
}
