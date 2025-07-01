"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { $fetch } from "ofetch";
import { SiweMessage } from "siwe";
import { addChain } from "viem/actions";
import { useAccount, useClient, useSignMessage } from "wagmi";
import { chain1, chain3 } from "~~/config/chains-config";
import { env } from "~~/utils/env";

const STORAGE_KEY = "rpc_auth";
const CHAIN_A_AUTH_API_URL = env.NEXT_PUBLIC_CHAIN_A_AUTH_API_URL;
const CHAIN_A_BASE_RPC_URL = env.NEXT_PUBLIC_CHAIN_A_BASE_RPC_URL;
const CHAIN_C_AUTH_API_URL = env.NEXT_PUBLIC_CHAIN_C_AUTH_API_URL;
const CHAIN_C_BASE_RPC_URL = env.NEXT_PUBLIC_CHAIN_C_BASE_RPC_URL;

type ChainAuthRecord = Record<string, string>; // address -> rpcToken
type AuthRecord = Record<number, ChainAuthRecord>; // chainId -> (address -> rpcToken)

type AuthData = {
  activeAddress: string | null;
  tokens: AuthRecord;
};

export const getStoredAuth = (): AuthData | null => {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    // Handle migration from old format
    const parsed = JSON.parse(raw);
    if (parsed && "address" in parsed && "rpcToken" in parsed) {
      // Convert old format to new format (single chain format)
      const oldAddress = parsed.address.toLowerCase();
      return {
        activeAddress: oldAddress,
        tokens: { [chain1.id]: { [oldAddress]: parsed.rpcToken } },
      };
    }

    // Handle migration from single chain format to multi-chain format
    if (parsed && parsed.tokens && !parsed.tokens[chain1.id] && !parsed.tokens[chain3.id]) {
      // This is the single-chain format, migrate to multi-chain
      return {
        activeAddress: parsed.activeAddress,
        tokens: { [chain1.id]: parsed.tokens },
      };
    }

    return parsed;
  } catch {
    return null;
  }
};

const setStoredAuth = (data: AuthData | null) => {
  if (typeof localStorage === "undefined") return;
  if (!data) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
};

export function useRpcLogin() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const client = useClient();
  const [auth, setAuth] = useState<AuthData | null>(() => getStoredAuth());
  const [isLoginPending, setIsLoginPending] = useState(false);

  const logout = useCallback(() => {
    if (auth && address) {
      console.log("Removing active address");
      const newAuth = {
        ...auth,
        activeAddress: null,
      };
      setAuth(newAuth);
      setStoredAuth(newAuth);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getAuthToken = useCallback(
    (chainId: number, address: string): string | null => {
      if (!auth) return null;
      const lowerAddress = address.toLowerCase();
      return auth.tokens[chainId]?.[lowerAddress] || null;
    },
    [auth],
  );

  const hasAuthToken = useCallback(
    (chainId: number, address: string): boolean => {
      return !!getAuthToken(chainId, address);
    },
    [getAuthToken],
  );

  // Update active address when it changes
  useEffect(() => {
    if (!address || !auth) return;

    const lowerAddress = address.toLowerCase();
    if (auth.activeAddress !== lowerAddress) {
      setAuth(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          activeAddress: lowerAddress,
        };
      });
      setStoredAuth({
        ...auth,
        activeAddress: lowerAddress,
      });
    }
  }, [address, auth]);

  const loginToChain = useCallback(
    async (chainId: number) => {
      if (!address) return;
      const lowerAddress = address.toLowerCase();

      // Check if we already have a token for this address and chain
      if (hasAuthToken(chainId, address)) {
        const updatedAuth = {
          ...(auth || { tokens: {} }),
          activeAddress: lowerAddress,
        };
        setAuth(updatedAuth);
        setStoredAuth(updatedAuth);
        return;
      }

      setIsLoginPending(true);

      try {
        const isChainA = chainId === chain1.id;
        const authApiUrl = isChainA ? CHAIN_A_AUTH_API_URL : CHAIN_C_AUTH_API_URL;
        const chain = isChainA ? chain1 : chain3;

        const nonce = await $fetch<string>(`${authApiUrl}/auth/nonce`, {
          credentials: "include",
        });

        const message = new SiweMessage({
          domain: window.location.host,
          address,
          statement: "Sign in with Ethereum",
          uri: window.location.href,
          version: "1",
          chainId: chain.id,
          nonce,
        }).prepareMessage();

        const signature = await signMessageAsync({ message });

        await $fetch(`${authApiUrl}/auth/verify`, {
          method: "POST",
          body: { message, signature },
          credentials: "include",
        });

        const tokenRes = await $fetch<{ ok: true; token: string }>(`${authApiUrl}/auth/token`, {
          credentials: "include",
        });

        const newTokens = { ...(auth?.tokens || {}) };
        if (!newTokens[chainId]) {
          newTokens[chainId] = {};
        }
        newTokens[chainId][lowerAddress] = tokenRes.token;

        const newAuth = {
          activeAddress: lowerAddress,
          tokens: newTokens,
        };

        setAuth(newAuth);
        setStoredAuth(newAuth);
      } catch (error) {
        console.error(`Login failed for chain ${chainId}`, error);
      } finally {
        setIsLoginPending(false);
      }
    },
    [address, signMessageAsync, auth, hasAuthToken],
  );

  // Convenience methods for specific chains
  const loginToChainA = useCallback(() => loginToChain(chain1.id), [loginToChain]);
  const loginToChainC = useCallback(() => loginToChain(chain3.id), [loginToChain]);

  const getFullRpcUrl = useCallback(
    (chainId: number) => {
      if (!auth?.activeAddress || !address) return null;
      const token = getAuthToken(chainId, address);
      if (!token) return null;

      const baseRpcUrl = chainId === chain1.id ? CHAIN_A_BASE_RPC_URL : CHAIN_C_BASE_RPC_URL;
      return `${baseRpcUrl}/${token}`;
    },
    [auth?.activeAddress, address, getAuthToken],
  );

  // Legacy fullRpcUrl for Chain A
  const fullRpcUrl = useMemo(() => {
    return getFullRpcUrl(chain1.id);
  }, [getFullRpcUrl]);

  const isChainAuthenticated = useCallback(
    (chainId: number) => {
      if (!auth?.activeAddress || !address) return false;
      const lowerAddress = address.toLowerCase();
      return auth.activeAddress === lowerAddress && hasAuthToken(chainId, address);
    },
    [auth, address, hasAuthToken],
  );

  // Legacy isRpcAuthenticated for Chain A
  const isRpcAuthenticated = useMemo(() => {
    return isChainAuthenticated(chain1.id);
  }, [isChainAuthenticated]);

  // Chain-specific authentication status (reactive)
  const isChainAAuthenticated = useMemo(() => {
    return isChainAuthenticated(chain1.id);
  }, [isChainAuthenticated]);

  const isChainCAuthenticated = useMemo(() => {
    return isChainAuthenticated(chain3.id);
  }, [isChainAuthenticated]);

  const saveChainToWallet = useCallback(
    async (chainId?: number) => {
      const targetChainId = chainId || chain1.id;
      const targetChain = targetChainId === chain1.id ? chain1 : chain3;
      const rpcUrl = getFullRpcUrl(targetChainId);

      if (!isChainAuthenticated(targetChainId) || !rpcUrl) {
        throw new Error(`User is not authenticated for chain ${targetChainId}`);
      }

      try {
        await addChain(client as any, {
          chain: {
            ...targetChain,
            rpcUrls: {
              default: {
                http: [rpcUrl],
              },
            },
          },
        });
      } catch (error) {
        console.warn(`Add network to wallet error: ${error}`);
      }
    },
    [client, getFullRpcUrl, isChainAuthenticated],
  );

  // Convenience methods for specific chains
  const saveChainAToWallet = useCallback(() => saveChainToWallet(chain1.id), [saveChainToWallet]);
  const saveChainCToWallet = useCallback(() => saveChainToWallet(chain3.id), [saveChainToWallet]);

  return {
    // Legacy methods (Chain A)
    isRpcAuthenticated,
    isLoginPending,
    logout,
    auth,
    fullRpcUrl,
    saveChainToWallet,

    // Multi-chain methods
    loginToChain,
    loginToChainA,
    loginToChainC,
    isChainAuthenticated,
    getFullRpcUrl,
    getAuthToken,
    hasAuthToken,
    saveChainAToWallet,
    saveChainCToWallet,

    // Chain-specific authentication status
    isChainAAuthenticated,
    isChainCAuthenticated,
    chainAFullRpcUrl: getFullRpcUrl(chain1.id),
    chainCFullRpcUrl: getFullRpcUrl(chain3.id),
  };
}
