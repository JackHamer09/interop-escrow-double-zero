import { useCallback, useEffect } from "react";
import useBalances, { getTokenWithBalanceByAssetId } from "./use-balances";
import { useInterval } from "./use-interval";
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
  const getConversionAmount = async (fromTokenAddress: Address, toTokenAddress: Address, amount: bigint) => {
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
  };

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

  // Function to fetch all created invoices
  const fetchCreatedInvoices = async (): Promise<Invoice[]> => {
    if (!address || !createdInvoiceCount) return [];

    try {
      // Get created invoice IDs
      const count = Number(createdInvoiceCount);
      if (count === 0) return [];

      const createdInvoiceIds = (await readContract(wagmiConfig as any, {
        ...options,
        chainId: mainChain.id,
        functionName: "getUserCreatedInvoices",
        args: [address, 0n, BigInt(count)],
      })) as bigint[];

      // Fetch details for each invoice
      const invoicePromises = createdInvoiceIds.map(id =>
        readContract(wagmiConfig as any, {
          ...options,
          chainId: mainChain.id,
          functionName: "getInvoiceDetails",
          args: [id],
        }),
      );

      const invoiceDetailsArray = await Promise.all(invoicePromises);

      // Convert array of results to Invoice objects
      return invoiceDetailsArray.map(details => ({
        id: details[0],
        creator: details[1],
        recipient: details[2],
        creatorChainId: details[3],
        recipientChainId: details[4],
        billingToken: details[5],
        amount: details[6],
        paymentToken: details[7],
        paymentAmount: details[8],
        status: details[9] as InvoiceStatus,
        createdAt: details[10],
        paidAt: details[11],
      }));
    } catch (error) {
      console.error("Error fetching created invoices:", error);
      return [];
    }
  };

  // Function to fetch all pending invoices
  const fetchPendingInvoices = async (): Promise<Invoice[]> => {
    if (!address || !pendingInvoiceCount) return [];

    try {
      // Get pending invoice IDs
      const count = Number(pendingInvoiceCount);
      if (count === 0) return [];

      const pendingInvoiceIds = (await readContract(wagmiConfig as any, {
        ...options,
        chainId: mainChain.id,
        functionName: "getUserPendingInvoices",
        args: [address, 0n, BigInt(count)],
      })) as bigint[];

      // Fetch details for each invoice
      const invoicePromises = pendingInvoiceIds.map(id =>
        readContract(wagmiConfig as any, {
          ...options,
          chainId: mainChain.id,
          functionName: "getInvoiceDetails",
          args: [id],
        }),
      );

      const invoiceDetailsArray = await Promise.all(invoicePromises);

      // Convert array of results to Invoice objects
      return invoiceDetailsArray.map(details => ({
        id: details[0],
        creator: details[1],
        recipient: details[2],
        creatorChainId: details[3],
        recipientChainId: details[4],
        billingToken: details[5],
        amount: details[6],
        paymentToken: details[7],
        paymentAmount: details[8],
        status: details[9] as InvoiceStatus,
        createdAt: details[10],
        paidAt: details[11],
      }));
    } catch (error) {
      console.error("Error fetching pending invoices:", error);
      return [];
    }
  };

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

    // Find token by address
    const tokenConfig = getTokenByAddress(billingToken);
    if (!tokenConfig) throw new Error("Token not found");

    const createInvoice = await toast.promise(
      writeContractAsync({
        ...options,
        functionName: "createInvoice",
        args: [recipient, BigInt(recipientChainId), billingToken, amount],
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
      writeContractAsync({
        ...options,
        functionName: "cancelInvoice",
        args: [invoiceId],
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

    await toast.promise(waitForTransactionReceipt({ hash: cancelInvoice }), {
      loading: "Canceling invoice...",
      success: "Invoice cancelled successfully!",
      error: err => {
        console.error(err);
        return "Failed to cancel invoice";
      },
    });

    return cancelInvoice;
  };

  // Pay an invoice
  const payInvoiceAsync = async (invoice: Invoice, paymentToken: Address) => {
    await switchChainIfNotSet(mainChain.id);

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

    // Approve payment token
    await checkAndApproveToken(paymentToken, paymentAmount);

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

  // Setup automatic refresh interval
  useInterval(() => {
    refetchAll();
  }, 3000);

  return {
    whitelistedTokens: whitelistedTokensData,
    createdInvoiceCount,
    pendingInvoiceCount,
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
