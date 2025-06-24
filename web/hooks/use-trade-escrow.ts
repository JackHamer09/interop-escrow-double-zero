import { useCallback, useEffect } from "react";
import useBalances, { getTokenWithBalanceByAssetId } from "./use-balances";
import useTradeEscrowInterop from "./use-trade-escrow-interop";
import { readContract } from "@wagmi/core";
import toast from "react-hot-toast";
import { Address, erc20Abi, formatUnits } from "viem";
import { useAccount, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { escrowMainChain, isEscrowMainChain } from "~~/config/escrow-trade-config";
import { getTokenByAddress } from "~~/config/tokens-config";
import { TRADE_ESCROW_ABI, TRADE_ESCROW_ADDRESS } from "~~/contracts/trade-escrow";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";
import waitForTransactionReceipt from "~~/utils/wait-for-transaction";

export const options = {
  address: TRADE_ESCROW_ADDRESS,
  abi: TRADE_ESCROW_ABI,
} as const;

export type EscrowTrade = {
  tradeId: bigint;
  partyA: Address;
  partyB: Address;
  partyBChainId: bigint;
  tokenA: Address;
  amountA: bigint;
  tokenB: Address;
  amountB: bigint;
  depositedA: boolean;
  depositedB: boolean;
  status: EscrowTradeStatus;
};

export enum EscrowTradeStatus {
  PendingCounterpartyDeposit = 0,
  Complete = 1,
  Declined = 2,
}

export default function useTradeEscrow() {
  const { address, chainId: walletChainId } = useAccount();
  const interop = useTradeEscrowInterop();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const { tokens, refetch: refetchTokens } = useBalances(walletChainId);

  const mainChain = escrowMainChain;

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
    const currentAllowance = await checkAllowance(token.addresses[walletChainId], address, TRADE_ESCROW_ADDRESS);

    // Check if we need to approve
    if (currentAllowance < amount) {
      // Approve token
      const approveHash = await toast.promise(
        writeContractAsync({
          abi: erc20Abi,
          address: token.addresses[walletChainId],
          functionName: "approve",
          args: [TRADE_ESCROW_ADDRESS, amount],
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

  const {
    data: myTrades,
    isSuccess: successfullyReceivedSwaps,
    refetch: refetchMySwaps,
  } = useReadContract({
    ...options,
    chainId: mainChain.id,
    functionName: "getMySwaps",
    args: [address || "0x"],
  });

  const refetchAll = useCallback(() => {
    refetchMySwaps();
  }, [refetchMySwaps]);

  // Refetch all when the address changes
  useEffect(() => {
    refetchMySwaps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, refetchAll]);

  const findTrade = (tradeId: bigint) => {
    const trade = myTrades?.find(trade => trade.tradeId === tradeId);
    if (!trade) throw new Error("Trade wasn't found");
    const myExpectedChainId = trade.partyA === address ? BigInt(mainChain.id) : trade.partyBChainId;
    return { ...trade, myExpectedChainId };
  };

  const proposeTradeAndDepositAsync = async (
    partyB: Address,
    partyBChainId: number,
    tokenA: Address,
    amountA: bigint,
    tokenB: Address,
    amountB: bigint,
  ) => {
    // Check if user is on main chain and show toast error if not
    if (!isEscrowMainChain(walletChainId || 0)) {
      toast.error(`Trade proposals can only be submitted on ${mainChain.name}. Please switch network in your wallet.`);
      return;
    }

    // Find token by address
    const tokenConfig = getTokenByAddress(tokenA);
    if (!tokenConfig) throw new Error("Token not found");

    // Find token in our tokens array
    const token = getTokenWithBalanceByAssetId(tokens, tokenConfig.assetId);
    if (!token) throw new Error("Token not found in wallet");

    // Check if we have enough balance
    if ((token.balance || 0n) < amountA) {
      toast.error(`Insufficient ${token.symbol} balance for this trade.`);
      return false;
    }

    // Check if we need to approve the token that Party A will deposit
    await checkAndApproveToken(tokenA, amountA);

    const createTrade = await toast.promise(
      writeContractAsync({
        ...options,
        functionName: "proposeTradeAndDeposit",
        args: [partyB, BigInt(partyBChainId), tokenA, amountA, tokenB, amountB],
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

    await toast.promise(waitForTransactionReceipt({ hash: createTrade }), {
      loading: "Creating trade and depositing funds...",
      success: "Trade created and funds deposited successfully!",
      error: err => {
        console.error(err);
        return "Failed to create trade and deposit funds";
      },
    });

    return createTrade;
  };

  const cancelTradeAsync = async (tradeId: bigint) => {
    const trade = findTrade(tradeId);
    await switchChainIfNotSet(Number(trade.myExpectedChainId));

    const cancelTrade = await toast.promise(
      isEscrowMainChain(Number(trade.myExpectedChainId))
        ? writeContractAsync({
            ...options,
            functionName: "cancelTrade",
            args: [tradeId],
          })
        : interop.cancelTradeAsync(tradeId),
      {
        loading: "Waiting for wallet approval...",
        success: "Transaction approved!",
        error: err => {
          console.error(err);
          return "Failed to approve transaction";
        },
      },
    );

    if (isEscrowMainChain(Number(trade.myExpectedChainId))) {
      await toast.promise(waitForTransactionReceipt({ hash: cancelTrade }), {
        loading: "Canceling trade...",
        success: "Trade cancelled successfully!",
        error: err => {
          console.error(err);
          return "Failed to cancel trade";
        },
      });
    }

    return cancelTrade;
  };

  const acceptTradeAndDepositAsync = async (tradeId: bigint) => {
    const trade = findTrade(tradeId);
    await switchChainIfNotSet(Number(trade.myExpectedChainId));

    // Check if the user has sufficient balance to accept the trade
    if (trade.partyB === address) {
      // Find token by address
      const tokenConfig = getTokenByAddress(trade.tokenB);
      if (!tokenConfig) throw new Error("Token not found");

      // Find token in our tokens array
      const token = getTokenWithBalanceByAssetId(tokens, tokenConfig.assetId);
      if (!token) throw new Error("Token not found in wallet");

      // Check if we have enough balance
      if ((token.balance || 0n) < trade.amountB) {
        toast.error(
          `Insufficient ${token.symbol} balance for this trade. You need ${formatUnits(trade.amountB, tokenConfig.decimals)} ${token.symbol}.`,
        );
        return false;
      }
    }

    // Handle token approvals for main chain case
    if (isEscrowMainChain(Number(trade.myExpectedChainId)) && trade.partyB === address) {
      // We only need to approve the token that party B will deposit
      await checkAndApproveToken(trade.tokenB, trade.amountB);
    }

    if (isEscrowMainChain(Number(trade.myExpectedChainId))) {
      const acceptTrade = await toast.promise(
        writeContractAsync({
          ...options,
          chainId: mainChain.id,
          functionName: "acceptAndDeposit",
          args: [tradeId],
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
      await toast.promise(waitForTransactionReceipt({ hash: acceptTrade }), {
        loading: "Processing transaction...",
        success: "Transaction confirmed! Funds deposited successfully.",
        error: err => {
          console.error(err);
          return "Failed to process transaction";
        },
      });
      return acceptTrade;
    } else {
      const acceptTrade = await interop.acceptTradeAndDepositAsync(tradeId, trade.tokenB, trade.amountB);
      return acceptTrade;
    }
  };

  return {
    myTrades,
    successfullyReceivedSwaps,
    refetchAll,
    refetchMySwaps,
    refetchTokens,
    proposeTradeAndDepositAsync,
    cancelTradeAsync,
    acceptTradeAndDepositAsync,
    tokens,
  };
}
