import { InteropTransactionBuilder } from "./use-interop-builder";
import { options } from "./use-invoice-contract";
import toast from "react-hot-toast";
import { type Address, Hash, encodeFunctionData, erc20Abi, parseEther } from "viem";
import { useAccount } from "wagmi";
import { invoiceMainChain, invoiceSupportedChains } from "~~/config/invoice-config";
import { getTokenByAddress } from "~~/config/tokens-config";

// Helper function to check if token approval is needed
async function checkNeedsApproval(
  builder: InteropTransactionBuilder,
  tokenAddress: Address,
  amount: bigint,
): Promise<boolean> {
  const allowance = await builder.checkAllowance(tokenAddress);
  return allowance < amount;
}

export default function useInvoiceContractInterop() {
  const { address } = useAccount();
  const mainChain = invoiceMainChain;

  // For now we're only supporting interop between the main chain and the first other chain
  // In the future this could be expanded to support more chains
  const supportedChain = invoiceSupportedChains.find(chain => chain.id !== mainChain.id);

  if (!supportedChain) {
    throw new Error("No supported interop chain found");
  }

  const feeAmount = parseEther("0.1");

  const cancelInvoiceAsync = async (invoiceId: bigint) => {
    if (!address) throw new Error("No address available");
    const builder = new InteropTransactionBuilder(supportedChain.id, mainChain.id, feeAmount, address);
    const data = encodeFunctionData({
      abi: options.abi,
      functionName: "cancelInvoice",
      args: [invoiceId],
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

  const payInvoiceAsync = async (invoiceId: bigint, paymentTokenAddress: Address, paymentAmount: bigint) => {
    if (!address) throw new Error("No address available");
    const builder = new InteropTransactionBuilder(supportedChain.id, mainChain.id, feeAmount, address);

    // Find token by address
    const token = getTokenByAddress(paymentTokenAddress);
    if (!token) throw new Error("Token not found");

    // Get token address for the supported chain
    const tokenAddressOnSupportedChain = token.addresses[supportedChain.id];
    if (!tokenAddressOnSupportedChain)
      throw new Error(`Token ${token.symbol} not supported on chain ${supportedChain.id}`);

    // 1. Approve NativeTokenVault if needed
    const tokenSymbol = token.symbol;
    const needsApproval = await checkNeedsApproval(builder, tokenAddressOnSupportedChain, paymentAmount);

    if (needsApproval) {
      await toast.promise(builder.approveNativeTokenVault(tokenAddressOnSupportedChain, paymentAmount), {
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
    builder.addTransfer({ assetId: token.assetId as Hash, amount: paymentAmount, to: aliasAddress });

    // 3. Approve allowance for token at Main Chain
    const mainChainTokenAddress = token.addresses[mainChain.id];
    if (!mainChainTokenAddress) throw new Error(`Token ${token.symbol} not supported on main chain`);

    const approvalData = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [options.address, paymentAmount],
    });
    builder.addTransaction({ contractAddress: mainChainTokenAddress, data: approvalData, value: 0n });

    // 4. Pay invoice transaction
    const payData = encodeFunctionData({
      abi: options.abi,
      functionName: "payInvoice",
      args: [invoiceId, paymentTokenAddress],
    });
    builder.addTransaction({ contractAddress: options.address, data: payData, value: feeAmount }); // Include fee value for cross-chain transfers

    const txHash = await toast.promise(builder.send(), {
      loading: "Waiting for wallet approval...",
      success: "Transaction approved!",
      error: err => {
        console.error(err);
        return "Failed to process transaction";
      },
    });

    await toast.promise(builder.waitUntilInteropTxProcessed(txHash), {
      loading: "Processing cross-chain payment...",
      success: "Payment processed successfully!",
      error: err => {
        console.error(err);
        return "Failed to process payment";
      },
    });

    return txHash;
  };

  return {
    cancelInvoiceAsync,
    payInvoiceAsync,
  };
}
