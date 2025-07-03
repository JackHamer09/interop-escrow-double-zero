import { InteropTransactionBuilder } from "./use-interop-builder";
import { options } from "./use-repo-contract";
import toast from "react-hot-toast";
import { type Address, Hash, encodeFunctionData, erc20Abi, parseEther } from "viem";
import { useAccount } from "wagmi";
import { repoMainChain } from "~~/config/repo-config";
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

export default function useRepoContractInterop() {
  const { address, chainId: walletChainId } = useAccount();
  const mainChain = repoMainChain;

  const feeAmount = parseEther("0.001");

  const createOfferAsync = async (
    lendToken: Address,
    lendAmount: bigint,
    collateralToken: Address,
    collateralAmount: bigint,
    duration: bigint,
    lenderRefundAddress: Address,
    lenderFee: bigint,
  ) => {
    if (!address) throw new Error("No address available");
    const builder = new InteropTransactionBuilder(walletChainId || 0, mainChain.id, feeAmount, address);

    // Find token by address
    const token = getTokenByAddress(lendToken);
    if (!token) throw new Error("Token not found");

    // Get token address for the wallet chain
    const tokenAddressOnWalletChain = token.addresses[walletChainId || 0];
    if (!tokenAddressOnWalletChain) throw new Error(`Token ${token.symbol} not supported on chain ${walletChainId}`);

    // 1. Approve NativeTokenVault if needed
    const tokenSymbol = token.symbol;
    const needsApproval = await checkNeedsApproval(builder, tokenAddressOnWalletChain, lendAmount);

    if (needsApproval) {
      await toast.promise(builder.approveNativeTokenVault(tokenAddressOnWalletChain, lendAmount), {
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
    builder.addTransfer({ assetId: token.assetId as Hash, amount: lendAmount, to: aliasAddress });

    // 3. Approve allowance for token at Main Chain
    const mainChainTokenAddress = token.addresses[mainChain.id];
    if (!mainChainTokenAddress) throw new Error(`Token ${token.symbol} not supported on main chain`);

    const approvalData = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [options.address, lendAmount],
    });
    builder.addTransaction({ contractAddress: mainChainTokenAddress, data: approvalData, value: 0n });

    // 4. Create offer transaction
    const createOfferData = encodeFunctionData({
      abi: options.abi,
      functionName: "createOffer",
      args: [
        lendToken,
        lendAmount,
        collateralToken,
        collateralAmount,
        duration,
        BigInt(walletChainId || 0),
        lenderRefundAddress,
        lenderFee,
      ],
    });
    builder.addTransaction({ contractAddress: options.address, data: createOfferData, value: 0n });

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

  const cancelOfferAsync = async (offerId: bigint) => {
    if (!address) throw new Error("No address available");
    const builder = new InteropTransactionBuilder(walletChainId || 0, mainChain.id, feeAmount, address);
    const data = encodeFunctionData({
      abi: options.abi,
      functionName: "cancelOffer",
      args: [offerId],
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

  const acceptOfferAsync = async (
    offerId: bigint,
    collateralTokenAddress: Address,
    collateralAmount: bigint,
    borrowerRefundAddress: Address,
  ) => {
    if (!address) throw new Error("No address available");
    const builder = new InteropTransactionBuilder(walletChainId || 0, mainChain.id, feeAmount, address);

    // Find token by address
    const token = getTokenByAddress(collateralTokenAddress);
    if (!token) throw new Error("Token not found");

    // Get token address for the wallet chain
    const tokenAddressOnWalletChain = token.addresses[walletChainId || 0];
    if (!tokenAddressOnWalletChain) throw new Error(`Token ${token.symbol} not supported on chain ${walletChainId}`);

    // 1. Approve NativeTokenVault if needed
    const tokenSymbol = token.symbol;
    const needsApproval = await checkNeedsApproval(builder, tokenAddressOnWalletChain, collateralAmount);

    if (needsApproval) {
      await toast.promise(builder.approveNativeTokenVault(tokenAddressOnWalletChain, collateralAmount), {
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
    builder.addTransfer({ assetId: token.assetId as Hash, amount: collateralAmount, to: aliasAddress });

    // 3. Approve allowance for token at Main Chain
    const mainChainTokenAddress = token.addresses[mainChain.id];
    if (!mainChainTokenAddress) throw new Error(`Token ${token.symbol} not supported on main chain`);

    const approvalData = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [options.address, collateralAmount],
    });
    builder.addTransaction({ contractAddress: mainChainTokenAddress, data: approvalData, value: 0n });

    // 4. Accept offer transaction
    const acceptData = encodeFunctionData({
      abi: options.abi,
      functionName: "acceptOffer",
      args: [offerId, BigInt(walletChainId || 0), borrowerRefundAddress],
    });
    builder.addTransaction({ contractAddress: options.address, data: acceptData, value: 0n });

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

  const repayLoanAsync = async (offerId: bigint, lendTokenAddress: Address, totalRepaymentAmount: bigint) => {
    if (!address) throw new Error("No address available");
    const builder = new InteropTransactionBuilder(walletChainId || 0, mainChain.id, feeAmount, address);

    // Find token by address
    const token = getTokenByAddress(lendTokenAddress);
    if (!token) throw new Error("Token not found");

    // Get token address for the wallet chain
    const tokenAddressOnWalletChain = token.addresses[walletChainId || 0];
    if (!tokenAddressOnWalletChain) throw new Error(`Token ${token.symbol} not supported on chain ${walletChainId}`);

    // 1. Approve NativeTokenVault if needed
    const tokenSymbol = token.symbol;
    const needsApproval = await checkNeedsApproval(builder, tokenAddressOnWalletChain, totalRepaymentAmount);

    if (needsApproval) {
      await toast.promise(builder.approveNativeTokenVault(tokenAddressOnWalletChain, totalRepaymentAmount), {
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
    builder.addTransfer({ assetId: token.assetId as Hash, amount: totalRepaymentAmount, to: aliasAddress });

    // 3. Approve allowance for token at Main Chain
    const mainChainTokenAddress = token.addresses[mainChain.id];
    if (!mainChainTokenAddress) throw new Error(`Token ${token.symbol} not supported on main chain`);

    const approvalData = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [options.address, totalRepaymentAmount],
    });
    builder.addTransaction({ contractAddress: mainChainTokenAddress, data: approvalData, value: 0n });

    // 4. Repay loan transaction
    const repayData = encodeFunctionData({
      abi: options.abi,
      functionName: "repayLoan",
      args: [offerId],
    });
    builder.addTransaction({ contractAddress: options.address, data: repayData, value: 0n });

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

  const claimCollateralAsync = async (offerId: bigint) => {
    if (!address) throw new Error("No address available");
    const builder = new InteropTransactionBuilder(walletChainId || 0, mainChain.id, feeAmount, address);
    const data = encodeFunctionData({
      abi: options.abi,
      functionName: "claimCollateral",
      args: [offerId],
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

  return {
    createOfferAsync,
    cancelOfferAsync,
    acceptOfferAsync,
    repayLoanAsync,
    claimCollateralAsync,
  };
}
