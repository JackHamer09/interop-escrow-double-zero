import { InteropTransactionBuilder } from "./use-interop-builder";
import { EscrowTrade } from "./use-trade-escrow";
import toast from "react-hot-toast";
import { type Address, Hash, encodeFunctionData, erc20Abi, parseEther } from "viem";
import { useAccount } from "wagmi";
import { escrowMainChain } from "~~/config/escrow-trade-config";
import { getTokenByAddress } from "~~/config/tokens-config";
import { TRADE_ESCROW_ABI, TRADE_ESCROW_ADDRESS } from "~~/contracts/trade-escrow";

// Helper function to check if token approval is needed
async function checkNeedsApproval(
  builder: InteropTransactionBuilder,
  tokenAddress: Address,
  amount: bigint,
): Promise<boolean> {
  const allowance = await builder.checkAllowance(tokenAddress);
  console.log(`Allowance for ${tokenAddress}: ${allowance}, required amount: ${amount}`);
  return allowance < amount;
}

export default function useTradeEscrowInterop() {
  const { address } = useAccount();

  const feeAmount = parseEther("0.1");

  const getMyExpectedChainId = (trade: EscrowTrade) => {
    // Because trade may only be initiated on main chain
    // and interop is only called for party b
    // we can assume that we're party B
    return trade.partyBChainId;
  };

  const cancelTradeAsync = async (trade: EscrowTrade) => {
    if (!address) throw new Error("No address available");

    const expectedChainId = getMyExpectedChainId(trade);
    const builder = new InteropTransactionBuilder(Number(expectedChainId), escrowMainChain.id, feeAmount, address);
    const data = encodeFunctionData({
      abi: TRADE_ESCROW_ABI,
      functionName: "cancelTrade",
      args: [trade.tradeId],
    });
    builder.addTransaction({ contractAddress: TRADE_ESCROW_ADDRESS, data, value: 0n });

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

  const acceptTradeAndDepositAsync = async (trade: EscrowTrade) => {
    if (!address) throw new Error("No address available");

    const expectedChainId = getMyExpectedChainId(trade);
    const builder = new InteropTransactionBuilder(Number(expectedChainId), escrowMainChain.id, feeAmount, address);

    // Find token by address
    const token = getTokenByAddress(trade.tokenB);
    if (!token) throw new Error("Token not found");

    // Get token address for the supported chain
    const expectedTokenAddress = token.addresses[Number(expectedChainId)];
    if (!expectedTokenAddress) {
      throw new Error(`Token ${token.symbol} not supported on chain ${Number(expectedChainId)}`);
    }

    // 1. Approve NativeTokenVault if needed
    const tokenSymbol = token.symbol;
    const tokenAmount = trade.amountB;
    const needsApproval = await checkNeedsApproval(builder, expectedTokenAddress, tokenAmount);

    if (needsApproval) {
      await toast.promise(builder.approveNativeTokenVault(expectedTokenAddress, tokenAmount), {
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
    builder.addTransfer({ assetId: token.assetId as Hash, amount: tokenAmount, to: aliasAddress });

    // 3. Approve allowance for token at Main Chain
    const mainChainTokenAddress = token.addresses[escrowMainChain.id];
    if (!mainChainTokenAddress) throw new Error(`Token ${token.symbol} not supported on main chain`);

    const approvalData = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [TRADE_ESCROW_ADDRESS, tokenAmount],
    });
    builder.addTransaction({ contractAddress: mainChainTokenAddress, data: approvalData, value: 0n });

    // 4. Deposit transaction
    const depositData = encodeFunctionData({
      abi: TRADE_ESCROW_ABI,
      functionName: "acceptAndDeposit",
      args: [trade.tradeId],
    });
    builder.addTransaction({ contractAddress: TRADE_ESCROW_ADDRESS, data: depositData, value: 0n });

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

  return {
    cancelTradeAsync,
    acceptTradeAndDepositAsync,
  };
}
