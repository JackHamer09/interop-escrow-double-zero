import { useCallback, useEffect } from "react";
import useBalances, { getTokenWithBalanceByAssetId } from "./use-balances";
import { useInterval } from "./use-interval";
import useInvoiceContractInterop from "./use-invoice-contract-interop";
import { readContract } from "@wagmi/core";
import toast from "react-hot-toast";
import { Address, erc20Abi, formatUnits } from "viem";
import { useAccount, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { InvoiceStatus, invoiceMainChain, isInvoiceMainChain } from "~~/config/invoice-config";
import { getTokenByAddress } from "~~/config/tokens-config";
import { INVOICE_CONTRACT_ABI, INVOICE_CONTRACT_ADDRESS } from "~~/contracts/invoice-payment";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";
import waitForTransactionReceipt from "~~/utils/wait-for-transaction";

export const options = {
  address: INVOICE_CONTRACT_ADDRESS,
  abi: INVOICE_CONTRACT_ABI,
} as const;

export type Invoice = {
  id: bigint;
  creator: Address;
  recipient: Address;
  creatorRefundAddress: Address;
  recipientRefundAddress: Address;
  creatorChainId: bigint;
  recipientChainId: bigint;
  billingToken: Address;
  amount: bigint;
  paymentToken: Address;
  paymentAmount: bigint;
  status: InvoiceStatus;
  createdAt: bigint;
  paidAt: bigint;
  text: string;
};

export default function useInvoiceContract() {
  const { address, chainId: walletChainId } = useAccount();
  const interop = useInvoiceContractInterop();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const { tokens, refetch: refetchTokens } = useBalances(walletChainId);

  const mainChain = invoiceMainChain;

  async function switchChainIfNotSet(chainId: number) {
    if (walletChainId !== chainId) {
      await switchChainAsync({ chainId });
    }
  }

  // Check allowance directly when needed
  async function checkAllowance(tokenAddress: Address, owner: Address, spender: Address): Promise<bigint> {
    try {
      const result = await readContract(wagmiConfig as any, {
        chainId: mainChain.id,
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "allowance",
        args: [owner, spender],
      });
      return result as bigint;
    } catch (error) {
      console.error("Error checking allowance:", error);
      return 0n;
    }
  }

  async function checkAndApproveToken(tokenAddress: Address, amount: bigint) {
    if (!address) throw new Error("No address available");
    if (!walletChainId) throw new Error("No chainId available");

    // Find token by address
    const tokenConfig = getTokenByAddress(tokenAddress);
    if (!tokenConfig) throw new Error("Token not found");

    // Find token in our tokens array
    const token = getTokenWithBalanceByAssetId(tokens, tokenConfig.assetId);
    if (!token) throw new Error("Token not found in wallet");

    // Check allowance directly when needed
    const currentAllowance = await checkAllowance(token.addresses[walletChainId], address, INVOICE_CONTRACT_ADDRESS);

    // Check if we need to approve
    if (currentAllowance < amount) {
      // Approve token
      const approveHash = await toast.promise(
        writeContractAsync({
          abi: erc20Abi,
          chainId: mainChain.id,
          address: token.addresses[walletChainId],
          functionName: "approve",
          args: [INVOICE_CONTRACT_ADDRESS, amount],
        }),
        {
          loading: `Approving use of ${token.symbol} funds...`,
          success: `${token.symbol} approved!`,
          error: err => {
            console.error(err);
            return `Failed to approve ${token.symbol}`;
          },
        },
      );

      await toast.promise(waitForTransactionReceipt({ hash: approveHash }), {
        loading: `Waiting for ${token.symbol} approval confirmation...`,
        success: `${token.symbol} approval confirmed!`,
        error: err => {
          console.error(err);
          return `Failed to approve ${token.symbol}`;
        },
      });
    }
  }

  // Get conversion amount between tokens
  const getConversionAmount = useCallback(
    async (fromTokenAddress: Address, toTokenAddress: Address, amount: bigint) => {
      try {
        return await readContract(wagmiConfig as any, {
          ...options,
          chainId: mainChain.id,
          functionName: "getConversionAmount",
          args: [fromTokenAddress, toTokenAddress, amount],
        });
      } catch (error) {
        console.error("Error getting conversion amount:", error);
        return 0n;
      }
    },
    [],
  );

  // Get whitelisted tokens
  const { data: whitelistedTokensData, refetch: refetchWhitelistedTokens } = useReadContract({
    ...options,
    chainId: mainChain.id,
    functionName: "getWhitelistedTokens",
  });

  // Get invoices created by the current user
  const { data: createdInvoiceCount, refetch: refetchCreatedInvoiceCount } = useReadContract({
    ...options,
    chainId: mainChain.id,
    functionName: "getUserCreatedInvoiceCount",
    args: [address || "0x"],
  });

  // Get invoices where current user is the recipient
  const { data: pendingInvoiceCount, refetch: refetchPendingInvoiceCount } = useReadContract({
    ...options,
    chainId: mainChain.id,
    functionName: "getUserPendingInvoiceCount",
    args: [address || "0x"],
  });

  // Create a new invoice
  const createInvoiceAsync = async (
    recipient: Address,
    recipientChainId: number,
    billingToken: Address,
    amount: bigint,
    text: string,
  ) => {
    if (!address) throw new Error("No address available");

    // Find token by address
    const tokenConfig = getTokenByAddress(billingToken);
    if (!tokenConfig) throw new Error("Token not found");

    try {
      if (isInvoiceMainChain(walletChainId || 0)) {
        const createInvoice = await toast.promise(
          writeContractAsync({
            ...options,
            chainId: mainChain.id,
            functionName: "createInvoice",
            args: [
              recipient,
              BigInt(recipientChainId),
              billingToken,
              amount,
              BigInt(walletChainId || 0),
              address, // creatorRefundAddress
              recipient, // recipientRefundAddress
              text,
            ],
          }),
          {
            loading: "Waiting for wallet approval...",
            success: "Transaction approved!",
            error: err => {
              console.error(err);
              return "Failed to approve transaction";
            },
          },
        );

        await toast.promise(waitForTransactionReceipt({ chainId: mainChain.id, hash: createInvoice }), {
          loading: "Creating invoice...",
          success: "Invoice created successfully!",
          error: err => {
            console.error(err);
            return "Failed to create invoice";
          },
        });

        return createInvoice;
      } else {
        const createInvoice = await interop.createInvoiceAsync(
          recipient,
          recipientChainId,
          billingToken,
          amount,
          text,
          address, // creatorRefundAddress
          recipient, // recipientRefundAddress
        );
        return createInvoice;
      }
    } catch (error) {
      console.error("Error creating invoice:", error);
      return false;
    }
  };

  // Cancel an invoice
  const cancelInvoiceAsync = async (invoice: Invoice) => {
    const expectedChainId =
      invoice.recipientRefundAddress === address ? Number(invoice.recipientChainId) : Number(invoice.creatorChainId);
    await switchChainIfNotSet(expectedChainId);

    if (isInvoiceMainChain(walletChainId || 0)) {
      const cancelInvoice = await toast.promise(
        writeContractAsync({
          ...options,
          chainId: mainChain.id,
          functionName: "cancelInvoice",
          args: [invoice.id],
        }),
        {
          loading: "Waiting for wallet approval...",
          success: "Transaction approved!",
          error: err => {
            console.error(err);
            return "Failed to approve transaction";
          },
        },
      );

      await toast.promise(waitForTransactionReceipt({ chainId: mainChain.id, hash: cancelInvoice }), {
        loading: "Canceling invoice...",
        success: "Invoice cancelled successfully!",
        error: err => {
          console.error(err);
          return "Failed to cancel invoice";
        },
      });

      return cancelInvoice;
    } else {
      const cancelInvoice = await interop.cancelInvoiceAsync(invoice.id);
      return cancelInvoice;
    }
  };

  // Pay an invoice
  const payInvoiceAsync = async (invoice: Invoice, paymentToken: Address) => {
    const expectedChainId = Number(invoice.recipientChainId);
    await switchChainIfNotSet(expectedChainId);

    // Calculate payment amount using the conversion rate
    const paymentAmount = await getConversionAmount(invoice.billingToken, paymentToken, invoice.amount);
    if (paymentAmount === 0n) {
      toast.error("Failed to calculate payment amount. Exchange rate may not be set.");
      return false;
    }

    // Find token by address
    const tokenConfig = getTokenByAddress(paymentToken);
    if (!tokenConfig) throw new Error("Payment token not found");

    // Find token in our tokens array
    const token = getTokenWithBalanceByAssetId(tokens, tokenConfig.assetId);
    if (!token) throw new Error("Payment token not found in wallet");

    // Check if we have enough balance
    if ((token.balance || 0n) < paymentAmount) {
      toast.error(
        `Insufficient ${token.symbol} balance for payment. You need ${formatUnits(paymentAmount, tokenConfig.decimals)} ${token.symbol}.`,
      );
      return false;
    }

    if (isInvoiceMainChain(expectedChainId)) {
      // Approve payment token
      await checkAndApproveToken(paymentToken, paymentAmount);
      const payInvoice = await toast.promise(
        writeContractAsync({
          ...options,
          chainId: mainChain.id,
          functionName: "payInvoice",
          args: [invoice.id, paymentToken],
          value: 0n, // We need to include ETH value for cross-chain transfers
        }),
        {
          loading: "Waiting for wallet approval...",
          success: "Transaction approved!",
          error: err => {
            console.error(err);
            return "Failed to approve transaction";
          },
        },
      );

      await toast.promise(waitForTransactionReceipt({ chainId: mainChain.id, hash: payInvoice }), {
        loading: "Processing payment...",
        success: "Invoice paid successfully!",
        error: err => {
          console.error(err);
          return "Failed to pay invoice";
        },
      });

      return payInvoice;
    } else {
      const payInvoice = await interop.payInvoiceAsync(invoice.id, paymentToken, paymentAmount, expectedChainId);
      return payInvoice;
    }
  };

  // Refetch all when the address changes
  useEffect(() => {
    if (address) {
      refetchAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  useInterval(() => {
    if (address) {
      refetchAll();
    }
  }, 3000);

  // Get created invoices directly
  const { data: createdInvoices, refetch: refetchCreatedInvoices } = useReadContract({
    ...options,
    chainId: mainChain.id,
    functionName: "getUserAllInvoices",
    args: [address || "0x", 0n, createdInvoiceCount || 10n, 0n, 0n],
    query: {
      enabled: !!address && !!createdInvoiceCount,
      select: data => data[0],
    },
  });

  // Get pending invoices directly
  const { data: pendingInvoices, refetch: refetchPendingInvoices } = useReadContract({
    ...options,
    chainId: mainChain.id,
    functionName: "getUserAllInvoices",
    args: [address || "0x", 0n, 0n, 0n, pendingInvoiceCount || 10n],
    query: {
      enabled: !!address && !!pendingInvoiceCount,
      select: data => data[1],
    },
  });

  const refetchAll = useCallback(() => {
    refetchCreatedInvoiceCount();
    refetchPendingInvoiceCount();
    refetchWhitelistedTokens();
    refetchCreatedInvoices();
    refetchPendingInvoices();
  }, [
    refetchCreatedInvoiceCount,
    refetchPendingInvoiceCount,
    refetchWhitelistedTokens,
    refetchCreatedInvoices,
    refetchPendingInvoices,
  ]);

  return {
    whitelistedTokens: whitelistedTokensData,
    createdInvoices,
    pendingInvoices,
    createdInvoiceCount,
    pendingInvoiceCount,
    getConversionAmount,
    refetchAll,
    refetchTokens,
    createInvoiceAsync,
    cancelInvoiceAsync,
    payInvoiceAsync,
    tokens,
  };
}
