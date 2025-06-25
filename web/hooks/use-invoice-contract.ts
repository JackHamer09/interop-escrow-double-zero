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

  // Function to fetch all invoices for the user at once
  const fetchAllInvoices = useCallback(async (): Promise<{ created: Invoice[]; pending: Invoice[] }> => {
    if (!address || (!createdInvoiceCount && !pendingInvoiceCount)) {
      return { created: [], pending: [] };
    }

    try {
      const createdCount = Number(createdInvoiceCount || 0);
      const pendingCount = Number(pendingInvoiceCount || 0);

      if (createdCount === 0 && pendingCount === 0) {
        return { created: [], pending: [] };
      }

      // Use the new batch function to get all invoices at once
      const result = (await readContract(wagmiConfig as any, {
        ...options,
        chainId: mainChain.id,
        functionName: "getUserAllInvoices",
        args: [address, 0n, BigInt(createdCount), 0n, BigInt(pendingCount)],
      })) as readonly [readonly Invoice[], readonly Invoice[]];

      const [createdInvoices, pendingInvoices] = result;

      return {
        created: [...createdInvoices],
        pending: [...pendingInvoices],
      };
    } catch (error) {
      console.error("Error fetching invoices:", error);
      return { created: [], pending: [] };
    }
  }, [address, createdInvoiceCount, pendingInvoiceCount, mainChain.id]);

  // Legacy functions for backward compatibility
  const fetchCreatedInvoices = useCallback(async (): Promise<Invoice[]> => {
    const result = await fetchAllInvoices();
    return result.created;
  }, [fetchAllInvoices]);

  const fetchPendingInvoices = useCallback(async (): Promise<Invoice[]> => {
    const result = await fetchAllInvoices();
    return result.pending;
  }, [fetchAllInvoices]);

  // Create a new invoice
  const createInvoiceAsync = async (
    recipient: Address,
    recipientChainId: number,
    billingToken: Address,
    amount: bigint,
  ) => {
    // Check if user is on main chain and show toast error if not
    if (!isInvoiceMainChain(walletChainId || 0)) {
      toast.error(`Invoices can only be created on ${mainChain.name}. Please switch network in your wallet.`);
      return false;
    }

    if (!address) throw new Error("No address available");

    // Find token by address
    const tokenConfig = getTokenByAddress(billingToken);
    if (!tokenConfig) throw new Error("Token not found");

    const createInvoice = await toast.promise(
      writeContractAsync({
        ...options,
        functionName: "createInvoice",
        args: [
          recipient,
          BigInt(recipientChainId),
          billingToken,
          amount,
          BigInt(walletChainId || mainChain.id),
          address, // creatorRefundAddress
          recipient, // recipientRefundAddress
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

    await toast.promise(waitForTransactionReceipt({ hash: createInvoice }), {
      loading: "Creating invoice...",
      success: "Invoice created successfully!",
      error: err => {
        console.error(err);
        return "Failed to create invoice";
      },
    });

    return createInvoice;
  };

  // Cancel an invoice
  const cancelInvoiceAsync = async (invoiceId: bigint) => {
    await switchChainIfNotSet(mainChain.id);

    const cancelInvoice = await toast.promise(
      isInvoiceMainChain(walletChainId || 0)
        ? writeContractAsync({
            ...options,
            functionName: "cancelInvoice",
            args: [invoiceId],
          })
        : interop.cancelInvoiceAsync(invoiceId),
      {
        loading: "Waiting for wallet approval...",
        success: "Transaction approved!",
        error: err => {
          console.error(err);
          return "Failed to approve transaction";
        },
      },
    );

    if (isInvoiceMainChain(walletChainId || 0)) {
      await toast.promise(waitForTransactionReceipt({ hash: cancelInvoice }), {
        loading: "Canceling invoice...",
        success: "Invoice cancelled successfully!",
        error: err => {
          console.error(err);
          return "Failed to cancel invoice";
        },
      });
    }

    return cancelInvoice;
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

    // Handle token approvals for main chain case
    if (isInvoiceMainChain(expectedChainId)) {
      // Approve payment token
      await checkAndApproveToken(paymentToken, paymentAmount);
    }

    if (isInvoiceMainChain(expectedChainId)) {
      const payInvoice = await toast.promise(
        writeContractAsync({
          ...options,
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

      await toast.promise(waitForTransactionReceipt({ hash: payInvoice }), {
        loading: "Processing payment...",
        success: "Invoice paid successfully!",
        error: err => {
          console.error(err);
          return "Failed to pay invoice";
        },
      });

      return payInvoice;
    } else {
      const payInvoice = await interop.payInvoiceAsync(invoice.id, paymentToken, paymentAmount);
      return payInvoice;
    }
  };

  const refetchAll = useCallback(() => {
    refetchCreatedInvoiceCount();
    refetchPendingInvoiceCount();
    refetchWhitelistedTokens();
  }, [refetchCreatedInvoiceCount, refetchPendingInvoiceCount, refetchWhitelistedTokens]);

  // Refetch all when the address changes
  useEffect(() => {
    if (address) {
      refetchAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  // Setup automatic refresh interval with a longer delay to prevent update loops
  useInterval(() => {
    // Only refetch if we're not in the middle of another operation
    if (address) {
      refetchAll();
    }
  }, 10000); // Increased to 10 seconds to reduce update frequency

  return {
    whitelistedTokens: whitelistedTokensData,
    createdInvoiceCount,
    pendingInvoiceCount,
    fetchAllInvoices,
    fetchCreatedInvoices,
    fetchPendingInvoices,
    getConversionAmount,
    refetchAll,
    refetchTokens,
    createInvoiceAsync,
    cancelInvoiceAsync,
    payInvoiceAsync,
    tokens,
  };
}
