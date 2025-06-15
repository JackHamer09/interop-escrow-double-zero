import { useEffect, useMemo } from "react";
import { useInterval } from "./use-interval";
import { erc20Abi } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import { TokenConfig, allTokens, getTokenAddress } from "~~/config/tokens-config";

export interface TokenWithBalance extends TokenConfig {
  balance: bigint | undefined;
}

interface UseBalancesOptions {
  /**
   * The interval in milliseconds to refresh balances
   * @default 1000 (1 second)
   */
  refreshInterval?: number | null;
}

/**
 * Hook that returns token balances for the current account
 * Automatically refreshes on a specified interval
 */
export default function useBalances(
  chainId: number | undefined,
  options: UseBalancesOptions = {},
): {
  tokens: TokenWithBalance[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => Promise<void>;
} {
  const { address } = useAccount();
  const { refreshInterval = 1000 } = options;

  // Prepare contracts configuration for fetching balances
  const tokenContracts = useMemo(() => {
    if (!chainId || !address) return [];

    const contracts = allTokens.flatMap(token => {
      const tokenAddress = getTokenAddress(token.assetId, chainId);
      if (!tokenAddress) return [];

      const balanceContract = {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
        chainId,
      } as const;

      return [balanceContract];
    });

    return contracts;
  }, [chainId, address]);

  // Read contract data for all tokens
  const {
    data: contractsData,
    isLoading,
    isError,
    refetch,
  } = useReadContracts({
    contracts: tokenContracts,
  });

  // Setup automatic refresh interval
  useInterval(() => {
    if (address && chainId) {
      refetch();
    }
  }, refreshInterval);

  // Parse the results into a more usable format
  const tokens = useMemo(() => {
    return allTokens.map((token, index) => {
      const tokenAddress = chainId && getTokenAddress(token.assetId, chainId);
      if (!tokenAddress) {
        return {
          ...token,
          balance: undefined,
        };
      }

      return {
        ...token,
        balance: contractsData?.[index]?.result,
      };
    });
  }, [contractsData, chainId]);

  // Fetch data when the component mounts and when dependencies change
  useEffect(() => {
    if (address && chainId) {
      refetch();
    }
  }, [address, chainId, refetch]);

  return {
    tokens,
    isLoading,
    isError,
    refetch: refetch as unknown as () => Promise<void>,
  };
}

/**
 * Helper function to find a token by assetId in the tokens array
 */
export function getTokenWithBalanceByAssetId(
  tokens: TokenWithBalance[],
  assetId: string,
): TokenWithBalance | undefined {
  return tokens.find(token => token.assetId === assetId);
}
