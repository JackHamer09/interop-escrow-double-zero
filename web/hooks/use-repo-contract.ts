import { useCallback, useEffect } from "react";
import useBalances, { getTokenWithBalanceByAssetId } from "./use-balances";
import { useInterval } from "./use-interval";
import useRepoContractInterop from "./use-repo-contract-interop";
import { readContract } from "@wagmi/core";
import toast from "react-hot-toast";
import { Address, erc20Abi, formatUnits } from "viem";
import { useAccount, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { RepoOfferStatus, isRepoMainChain, repoMainChain } from "~~/config/repo-config";
import { getTokenByAddress } from "~~/config/tokens-config";
import { REPO_CONTRACT_ABI, REPO_CONTRACT_ADDRESS } from "~~/contracts/repo-contract";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";
import waitForTransactionReceipt from "~~/utils/wait-for-transaction";

export const options = {
  address: REPO_CONTRACT_ADDRESS,
  abi: REPO_CONTRACT_ABI,
} as const;

export type RepoOffer = {
  offerId: bigint;
  lender: Address;
  borrower: Address;
  lenderRefundAddress: Address;
  borrowerRefundAddress: Address;
  lenderChainId: bigint;
  borrowerChainId: bigint;
  lendToken: Address;
  lendAmount: bigint;
  collateralToken: Address;
  collateralAmount: bigint;
  duration: bigint;
  startTime: bigint;
  endTime: bigint;
  status: RepoOfferStatus;
};

export default function useRepoContract() {
  const { address, chainId: walletChainId } = useAccount();
  const interop = useRepoContractInterop();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const { tokens, refetch: refetchTokens } = useBalances(walletChainId);

  const mainChain = repoMainChain;

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
    const currentAllowance = await checkAllowance(token.addresses[walletChainId], address, REPO_CONTRACT_ADDRESS);

    // Check if we need to approve
    if (currentAllowance < amount) {
      // Approve token
      const approveHash = await toast.promise(
        writeContractAsync({
          abi: [
            {
              type: "function",
              name: "approve",
              inputs: [
                { name: "spender", type: "address", internalType: "address" },
                { name: "value", type: "uint256", internalType: "uint256" },
              ],
              outputs: [{ name: "", type: "bool", internalType: "bool" }],
              stateMutability: "nonpayable",
            },
          ],
          address: token.addresses[walletChainId],
          functionName: "approve",
          args: [REPO_CONTRACT_ADDRESS, amount],
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

  // Get open offers from the contract
  const { data: openOffers, refetch: refetchOpenOffers } = useReadContract({
    ...options,
    chainId: mainChain.id,
    functionName: "getOpenOffers",
    query: {
      gcTime: 1000,
      refetchInterval: 1000, // Refresh every second
      refetchIntervalInBackground: true,
    },
  });

  // Get lender offers for the current address
  const { data: lenderOffers, refetch: refetchLenderOffers } = useReadContract({
    ...options,
    chainId: mainChain.id,
    functionName: "getLenderOffers",
    args: [address || "0x"],
  });

  // Get borrower offers for the current address
  const { data: borrowerOffers, refetch: refetchBorrowerOffers } = useReadContract({
    ...options,
    chainId: mainChain.id,
    functionName: "getBorrowerOffers",
    args: [address || "0x"],
  });

  // Get grace period from the contract
  const { data: gracePeriod } = useReadContract({
    ...options,
    chainId: mainChain.id,
    functionName: "gracePeriod",
  });

  const refetchAll = useCallback(() => {
    refetchOpenOffers();
    refetchLenderOffers();
    refetchBorrowerOffers();
  }, [refetchOpenOffers, refetchLenderOffers, refetchBorrowerOffers]);

  // Refetch all when the address changes
  useEffect(() => {
    if (address) {
      refetchAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  // Find a specific offer by ID
  const findOffer = (offerId: bigint, offers: readonly RepoOffer[] | undefined) => {
    const offer = offers?.find(offer => offer.offerId === offerId);
    if (!offer) throw new Error("Offer wasn't found");
    return offer;
  };

  // Create a new lending offer
  const createOfferAsync = async (
    lendToken: Address,
    lendAmount: bigint,
    collateralToken: Address,
    collateralAmount: bigint,
    duration: bigint,
    lenderChainId: number,
    lenderRefundAddress: Address,
  ) => {
    // Check if user is on main chain and show toast error if not
    if (!isRepoMainChain(walletChainId || 0)) {
      toast.error(`Offers can only be created on ${mainChain.name}. Please switch network in your wallet.`);
      return false;
    }

    // Find token by address
    const tokenConfig = getTokenByAddress(lendToken);
    if (!tokenConfig) throw new Error("Token not found");

    // Find token in our tokens array
    const token = getTokenWithBalanceByAssetId(tokens, tokenConfig.assetId);
    if (!token) throw new Error("Token not found in wallet");

    // Check if we have enough balance
    if ((token.balance || 0n) < lendAmount) {
      toast.error(`Insufficient ${token.symbol} balance for this offer.`);
      return false;
    }

    // Check if we need to approve the token that will be lent
    await checkAndApproveToken(lendToken, lendAmount);

    const createOffer = await toast.promise(
      writeContractAsync({
        ...options,
        functionName: "createOffer",
        args: [
          lendToken,
          lendAmount,
          collateralToken,
          collateralAmount,
          duration,
          BigInt(lenderChainId),
          lenderRefundAddress,
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

    await toast.promise(waitForTransactionReceipt({ hash: createOffer }), {
      loading: "Creating offer and depositing funds...",
      success: "Offer created and funds deposited successfully!",
      error: err => {
        console.error(err);
        return "Failed to create offer and deposit funds";
      },
    });

    return createOffer;
  };

  // Cancel an existing offer
  const cancelOfferAsync = async (offerId: bigint) => {
    await switchChainIfNotSet(mainChain.id);

    const cancelOffer = await toast.promise(
      writeContractAsync({
        ...options,
        functionName: "cancelOffer",
        args: [offerId],
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

    await toast.promise(waitForTransactionReceipt({ hash: cancelOffer }), {
      loading: "Canceling offer...",
      success: "Offer cancelled successfully!",
      error: err => {
        console.error(err);
        return "Failed to cancel offer";
      },
    });

    return cancelOffer;
  };

  // Accept an offer as borrower
  const acceptOfferAsync = async (offerId: bigint, borrowerChainId: number, borrowerRefundAddress: Address) => {
    await switchChainIfNotSet(mainChain.id);

    // Find the offer
    const offer = findOffer(offerId, openOffers);

    // Check if the user has sufficient balance for the collateral
    const tokenConfig = getTokenByAddress(offer.collateralToken);
    if (!tokenConfig) throw new Error("Collateral token not found");

    // Find token in our tokens array
    const token = getTokenWithBalanceByAssetId(tokens, tokenConfig.assetId);
    if (!token) throw new Error("Collateral token not found in wallet");

    // Check if we have enough balance
    if ((token.balance || 0n) < offer.collateralAmount) {
      toast.error(
        `Insufficient ${token.symbol} balance for collateral. You need ${formatUnits(offer.collateralAmount, tokenConfig.decimals)} ${token.symbol}.`,
      );
      return false;
    }

    // Approve collateral token
    await checkAndApproveToken(offer.collateralToken, offer.collateralAmount);

    const acceptOffer = await toast.promise(
      writeContractAsync({
        ...options,
        functionName: "acceptOffer",
        args: [offerId, BigInt(borrowerChainId), borrowerRefundAddress],
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

    await toast.promise(waitForTransactionReceipt({ hash: acceptOffer }), {
      loading: "Accepting offer and depositing collateral...",
      success: "Offer accepted and collateral deposited successfully!",
      error: err => {
        console.error(err);
        return "Failed to accept offer and deposit collateral";
      },
    });

    return acceptOffer;
  };

  // Repay a loan
  const repayLoanAsync = async (offerId: bigint) => {
    await switchChainIfNotSet(mainChain.id);

    // Find the offer from borrower offers
    const offer = findOffer(offerId, borrowerOffers);

    // Check if the user has sufficient balance to repay
    const tokenConfig = getTokenByAddress(offer.lendToken);
    if (!tokenConfig) throw new Error("Lend token not found");

    // Find token in our tokens array
    const token = getTokenWithBalanceByAssetId(tokens, tokenConfig.assetId);
    if (!token) throw new Error("Lend token not found in wallet");

    // Check if we have enough balance
    if ((token.balance || 0n) < offer.lendAmount) {
      toast.error(
        `Insufficient ${token.symbol} balance to repay loan. You need ${formatUnits(offer.lendAmount, tokenConfig.decimals)} ${token.symbol}.`,
      );
      return false;
    }

    // Approve lend token for repayment
    await checkAndApproveToken(offer.lendToken, offer.lendAmount);

    const repayLoan = await toast.promise(
      writeContractAsync({
        ...options,
        functionName: "repayLoan",
        args: [offerId],
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

    await toast.promise(waitForTransactionReceipt({ hash: repayLoan }), {
      loading: "Repaying loan...",
      success: "Loan repaid successfully! Your collateral has been released.",
      error: err => {
        console.error(err);
        return "Failed to repay loan";
      },
    });

    return repayLoan;
  };

  // Claim collateral as lender when loan defaults
  const claimCollateralAsync = async (offerId: bigint) => {
    await switchChainIfNotSet(mainChain.id);

    const claimCollateral = await toast.promise(
      writeContractAsync({
        ...options,
        functionName: "claimCollateral",
        args: [offerId],
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

    await toast.promise(waitForTransactionReceipt({ hash: claimCollateral }), {
      loading: "Claiming collateral...",
      success: "Collateral claimed successfully!",
      error: err => {
        console.error(err);
        return "Failed to claim collateral";
      },
    });

    return claimCollateral;
  };

  // Helper function to get historical offers
  const getHistoricalOffers = () => {
    const historicalLenderOffers = (lenderOffers || []).filter(
      offer =>
        offer.status === RepoOfferStatus.Completed ||
        offer.status === RepoOfferStatus.Cancelled ||
        offer.status === RepoOfferStatus.Defaulted,
    );

    const historicalBorrowerOffers = (borrowerOffers || []).filter(
      offer =>
        offer.status === RepoOfferStatus.Completed ||
        offer.status === RepoOfferStatus.Cancelled ||
        offer.status === RepoOfferStatus.Defaulted,
    );

    // Combine both arrays and sort by offerId in descending order (newest first)
    return [...historicalLenderOffers, ...historicalBorrowerOffers].sort((a, b) => Number(b.offerId - a.offerId));
  };

  // Setup automatic refresh interval
  useInterval(() => {
    refetchAll();
  }, 1000);

  return {
    openOffers,
    lenderOffers,
    borrowerOffers,
    historicalOffers: getHistoricalOffers(),
    refetchAll,
    refetchOpenOffers,
    refetchLenderOffers,
    refetchBorrowerOffers,
    refetchTokens,
    createOfferAsync,
    cancelOfferAsync,
    acceptOfferAsync,
    repayLoanAsync,
    claimCollateralAsync,
    tokens,
    gracePeriod,
  };
}
