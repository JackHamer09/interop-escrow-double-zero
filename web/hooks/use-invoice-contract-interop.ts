import { InteropTransactionBuilder } from "./use-interop-builder";
import { options } from "./use-invoice-contract";
import toast from "react-hot-toast";
import { type Address, encodeFunctionData, erc20Abi, parseEther } from "viem";
import { useAccount } from "wagmi";
import { invoiceMainChain } from "~~/config/invoice-config";
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
  const { address, chainId: walletChainId } = useAccount();
  const mainChain = invoiceMainChain;

  const feeAmount = parseEther("0.001");

  const cancelInvoiceAsync = async (invoiceId: bigint) => {
    if (!address) throw new Error("No address available");
    const builder = new InteropTransactionBuilder(walletChainId || 0, mainChain.id, feeAmount, address);
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

  const payInvoiceAsync = async (
    invoiceId: bigint,
    paymentTokenAddress: Address,
    paymentAmount: bigint,
    expectedChainId: number,
  ) => {
    if (!address) throw new Error("No address available");
    const builder = new InteropTransactionBuilder(expectedChainId, mainChain.id, feeAmount, address);

    // Find token by address
    const token = getTokenByAddress(paymentTokenAddress);
    if (!token) throw new Error("Token not found");

    // Get token address for the expected chain
    const tokenAddressOnExpectedChain = token.addresses[expectedChainId];
    if (!tokenAddressOnExpectedChain)
      throw new Error(`Token ${token.symbol} not supported on chain ${expectedChainId}`);

    // 1. Approve NativeTokenVault if needed
    const tokenSymbol = token.symbol;
    const needsApproval = await checkNeedsApproval(builder, tokenAddressOnExpectedChain, paymentAmount);

    if (needsApproval) {
      await toast.promise(builder.approveNativeTokenVault(tokenAddressOnExpectedChain, paymentAmount), {
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
    builder.addTransfer({ assetId: token.assetId, amount: paymentAmount, to: aliasAddress });

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
    builder.addTransaction({ contractAddress: options.address, data: payData, value: 0n }); // Include fee value for cross-chain transfers

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

  const createInvoiceAsync = async (
    recipient: Address,
    recipientChainId: number,
    billingToken: Address,
    amount: bigint,
    text: string,
    creatorRefundAddress: Address,
    recipientRefundAddress: Address,
  ) => {
    if (!address) throw new Error("No address available");
    if (!walletChainId) throw new Error("No wallet chain ID available");

    const builder = new InteropTransactionBuilder(walletChainId || 0, mainChain.id, feeAmount, address);

    const data = encodeFunctionData({
      abi: options.abi,
      functionName: "createInvoice",
      args: [
        recipient,
        BigInt(recipientChainId),
        billingToken,
        amount,
        BigInt(walletChainId),
        creatorRefundAddress,
        recipientRefundAddress,
        text,
      ],
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
      loading: "Creating invoice...",
      success: "Invoice created successfully!",
      error: err => {
        console.error(err);
        return "Failed to create invoice";
      },
    });

    return txHash;
  };

  return {
    cancelInvoiceAsync,
    payInvoiceAsync,
    createInvoiceAsync,
  };
}
