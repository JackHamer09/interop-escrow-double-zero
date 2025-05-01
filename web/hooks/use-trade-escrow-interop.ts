import { InteropTransactionBuilder } from "./use-interop-builder";
import { options } from "./use-trade-escrow";
import toast from "react-hot-toast";
import { type Address, Hash, encodeFunctionData, parseEther } from "viem";
import { useAccount } from "wagmi";
import { ERC20_ABI, TTBILL_TOKEN, USDC_TOKEN } from "~~/contracts/tokens";
import { chain1, chain2 } from "~~/services/web3/wagmiConfig";

// Helper function to check if token approval is needed
async function checkNeedsApproval(
  builder: InteropTransactionBuilder,
  tokenAddress: Address,
  amount: bigint,
): Promise<boolean> {
  const allowance = await builder.checkAllowance(tokenAddress);
  return allowance < amount;
}

export default function useTradeEscrowInterop() {
  const { address } = useAccount();

  // TODO: fee can be much lower, and in perfect implementation should be estimated instead of being hardcoded
  const feeAmount = parseEther("0.1");

  // TODO: can not propose from chain b
  // const proposeTradeAndDepositAsync = async (
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
  //     functionName: "proposeTradeAndDeposit",
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

    const txHash = await toast.promise(builder.send(), {
      loading: "Waiting for wallet approval...",
      success: "Transaction approved!",
      error: err => {
        console.error(err);
        return "Failed to process transaction";
      },
    });

    await toast.promise(builder.waitUntilInteropTxProcessed(txHash), {
      loading: "Processing cross-chain transaction...",
      success: "Transaction processed successfully!",
      error: err => {
        console.error(err);
        return "Failed to process transaction";
      },
    });

    return txHash;
  };

  const acceptTradeAndDepositAsync = async (tradeId: bigint, tokenAddress: Address, amount: bigint) => {
    if (!address) throw new Error("No address available");
    const builder = new InteropTransactionBuilder(chain2.id, chain1.id, feeAmount, address);

    const tokens = [USDC_TOKEN, TTBILL_TOKEN];
    const token = tokens.find(e => [e.address, e.address_chain2].includes(tokenAddress));
    if (!token) throw new Error("Token not found");

    // 1. Approve NativeTokenVault if needed
    const tokenSymbol = token.symbol;
    const needsApproval = await checkNeedsApproval(builder, token.address_chain2, amount);

    if (needsApproval) {
      await toast.promise(builder.approveNativeTokenVault(token.address_chain2, amount), {
        loading: `Approving use of ${tokenSymbol} funds...`,
        success: `${tokenSymbol} approved!`,
        error: err => {
          console.error(err);
          return `Failed to approve ${tokenSymbol}`;
        },
      });
    }

    // 2. Transfer funds to aliased address
    const aliasAddress = await builder.getAliasedAddress(address);
    console.log(`Alias of ${address} is ${aliasAddress}`);
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
      functionName: "acceptAndDeposit",
      args: [tradeId],
    });
    builder.addTransaction({ contractAddress: options.address, data: depositData, value: 0n });

    const txHash = await toast.promise(builder.send(), {
      loading: "Waiting for wallet approval...",
      success: "Transaction approved!",
      error: err => {
        console.error(err);
        return "Failed to process transaction";
      },
    });

    await toast.promise(builder.waitUntilInteropTxProcessed(txHash), {
      loading: "Processing cross-chain transaction...",
      success: "Transaction processed successfully!",
      error: err => {
        console.error(err);
        return "Failed to process transaction";
      },
    });

    return txHash;
  };

  // Removed depositTradeAsync to enforce strict 2-step process

  return {
    cancelTradeAsync,
    acceptTradeAndDepositAsync,
  };
}
