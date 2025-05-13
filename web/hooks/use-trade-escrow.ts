import { useCallback, useEffect } from "react";
import useTradeEscrowInterop from "./use-trade-escrow-interop";
import useTtbillToken from "./use-ttbill-token";
import useUsdcToken from "./use-usdc-token";
import toast from "react-hot-toast";
import { Address } from "viem";
import { useAccount, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { USDC_TOKEN } from "~~/contracts/tokens";
import { TRADE_ESCROW_ABI, TRADE_ESCROW_ADDRESS } from "~~/contracts/trade-escrow";
import { chain1 } from "~~/services/web3/wagmiConfig";
import waitForTransactionReceipt from "~~/utils/wait-for-transaction";

export const options = {
  address: TRADE_ESCROW_ADDRESS,
  abi: TRADE_ESCROW_ABI,
} as const;

export type EscrowTrade = {
  tradeId: bigint;
  partyA: string;
  partyB: string;
  partyBChainId: bigint;
  tokenA: string;
  amountA: bigint;
  tokenB: string;
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
  const usdcToken = useUsdcToken();
  const ttbillToken = useTtbillToken();

  async function switchChainIfNotSet(chainId: number) {
    if (walletChainId !== chainId) {
      await switchChainAsync({ chainId });
    }
  }

  async function checkAndApproveToken(tokenAddress: string, amount: bigint) {
    if (!address) throw new Error("No address available");

    // Determine which token we're working with
    const tokenInfo =
      tokenAddress === USDC_TOKEN.address
        ? { token: usdcToken, symbol: "USDC" }
        : { token: ttbillToken, symbol: "TTBILL" };

    // Check if we need to approve
    if ((tokenInfo.token.allowance ?? 0n) < amount) {
      const approveHash = await toast.promise(tokenInfo.token.approve(amount), {
        loading: `Approving use of ${tokenInfo.symbol} funds...`,
        success: `${tokenInfo.symbol} approved!`,
        error: err => {
          console.error(err);
          return `Failed to approve ${tokenInfo.symbol}`;
        },
      });

      await toast.promise(waitForTransactionReceipt({ hash: approveHash }), {
        loading: `Waiting for ${tokenInfo.symbol} approval confirmation...`,
        success: `${tokenInfo.symbol} approval confirmed!`,
        error: err => {
          console.error(err);
          return `Failed to approve ${tokenInfo.symbol}`;
        },
      });

      // Refetch allowance after approval
      await tokenInfo.token.refetchAllowance();
    }
  }

  const {
    data: myTrades,
    isSuccess: successfullyReceivedSwaps,
    refetch: refetchMySwaps,
  } = useReadContract({
    ...options,
    chainId: chain1.id,
    functionName: "getMySwaps",
    args: [address || "0x"],
  });

  const refetchAll = useCallback(() => {
    console.log("Refetching 1");
    refetchMySwaps();
  }, [refetchMySwaps]);

  // Refetch all when the address changes
  useEffect(() => {
    console.log("Refetching 2");
    refetchMySwaps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, refetchAll]);

  const findTrade = (tradeId: bigint) => {
    const trade = myTrades?.find(trade => trade.tradeId === tradeId);
    if (!trade) throw new Error("Trade wasn't found");
    const myExpectedChainId = trade.partyA === address ? BigInt(chain1.id) : trade.partyBChainId;
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
    // Check if user is on Chain B and show toast error
    if (walletChainId !== chain1.id) {
      toast.error(`Trade proposals can only be submitted on ${chain1.name}. Please switch network in your wallet.`);
      return;
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
      trade.myExpectedChainId === BigInt(chain1.id)
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

    if (trade.myExpectedChainId === BigInt(chain1.id)) {
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

    // Handle token approvals for chain1 case
    if (trade.myExpectedChainId === BigInt(chain1.id) && trade.partyB === address) {
      // We only need to approve the token that party B will deposit
      await checkAndApproveToken(trade.tokenB, trade.amountB);
    }

    if (trade.myExpectedChainId === BigInt(chain1.id)) {
      const acceptTrade = await toast.promise(
        writeContractAsync({
          ...options,
          chainId: chain1.id,
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

  // Removed depositTradeAsync to enforce strict 2-step process

  const refetchTokenInfo = () => {
    usdcToken.refetchAll();
    ttbillToken.refetchAll();
  };

  return {
    myTrades,
    successfullyReceivedSwaps,
    refetchAll,
    refetchMySwaps,
    refetchTokenInfo,
    proposeTradeAndDepositAsync,
    cancelTradeAsync,
    acceptTradeAndDepositAsync,
  };
}
