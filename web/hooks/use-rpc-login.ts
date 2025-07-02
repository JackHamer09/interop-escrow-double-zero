"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { $fetch } from "ofetch";
import { SiweMessage } from "siwe";
import { getAddress } from "viem";
import { addChain } from "viem/actions";
import { useAccount, useClient, useSignMessage } from "wagmi";
import { allChains, chain1, chain3, chainsAuthEndpoints } from "~~/config/chains-config";

const STORAGE_KEY = "rpc_auth_v2";

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
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    return data;
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
  const [auth, _setAuth] = useState<AuthData | null>(() => getStoredAuth());
  const setAuth = useCallback((data: AuthData | null) => {
    _setAuth(data);
    setStoredAuth(data);
  }, []);
  const [isLoginPending, setIsLoginPending] = useState(false);

  const logout = useCallback(() => {
    console.log("Logging out from RPC auth");
    setAuth(null);
  }, [setAuth]);

  const getAuthToken = useCallback(
    (chainId: number, address: string): string | null => {
      if (!auth) return null;
      return auth.tokens[chainId]?.[address.toLowerCase()] || null;
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
    if (!auth) return;

    if (!address) {
      logout();
      return;
    }

    const lowerAddress = address.toLowerCase();
    if (auth.activeAddress !== lowerAddress) {
      setAuth({
        ...auth,
        activeAddress: lowerAddress,
      });
    }
  }, [address, auth, setAuth, logout]);

  const loginToChain = useCallback(
    async (chainId: number) => {
      if (!address) return;
      const lowerAddress = address.toLowerCase();

      const targetChain = allChains.find(chain => chain.id === chainId);
      if (!targetChain) {
        throw new Error(`Chain with ID ${chainId} not found`);
      }

      const authEndpoints = chainsAuthEndpoints[chainId];
      if (!authEndpoints) {
        throw new Error(`No auth endpoints configured for chain ${chainId}`);
      }

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
        /* 1. Get nonce */
        const nonce = await $fetch<string>(`${authEndpoints.authApiUrl}/auth/nonce`, {
          credentials: "include",
        }).catch(error => {
          throw new Error(`Nonce fetch failed: ${error.message}`);
        });

        /* 2. Sign message */
        const message = new SiweMessage({
          domain: window.location.host,
          address: getAddress(lowerAddress),
          statement: "Sign in with Ethereum",
          uri: window.location.href,
          version: "1",
          chainId: targetChain.id,
          nonce,
        }).prepareMessage();
        const signature = await signMessageAsync({ message });

        /* 3. Verify signature */
        await $fetch(`${authEndpoints.authApiUrl}/auth/verify`, {
          method: "POST",
          body: { message, signature },
          credentials: "include",
        }).catch(error => {
          throw new Error(`Signature verification failed: ${error.message}`);
        });

        /* 4. Fetch token */
        const tokenRes = await $fetch<{ ok: true; token: string }>(`${authEndpoints.authApiUrl}/auth/token`, {
          credentials: "include",
        }).catch(error => {
          throw new Error(`Token fetch failed: ${error.message}`);
        });

        console.log(`Login successful for chain ${chainId}. New RPC token:`, tokenRes);

        /* 5. Save tokens to auth state */
        const getUpdatedTokens = () => {
          const tokens = { ...(auth?.tokens || {}) };
          if (!tokens[chainId]) {
            tokens[chainId] = {};
          }
          tokens[chainId][lowerAddress] = tokenRes.token;
          const newAuth: AuthData = {
            activeAddress: lowerAddress,
            tokens,
          };
          return newAuth;
        };
        setAuth(getUpdatedTokens());
      } catch (error) {
        console.error(`Login failed for chain ${chainId}`, error);
      } finally {
        setIsLoginPending(false);
      }
    },
    [address, signMessageAsync, auth, hasAuthToken, setAuth],
  );

  // Convenience methods for specific chains
  const loginToChainA = useCallback(() => loginToChain(chain1.id), [loginToChain]);
  const loginToChainC = useCallback(() => loginToChain(chain3.id), [loginToChain]);

  const getFullRpcUrl = useCallback(
    (chainId: number) => {
      if (!auth?.activeAddress || !address) return null;
      const authToken = getAuthToken(chainId, address);
      if (!authToken) return null;

      const chainAuthEndpoints = chainsAuthEndpoints[chainId];
      if (!chainAuthEndpoints) return null;

      return `${chainAuthEndpoints.baseRpcUrl}/${authToken}`;
    },
    [address, auth, getAuthToken],
  );

  // Legacy fullRpcUrl for Chain A
  // const fullRpcUrl = useMemo(() => {
  //   return getFullRpcUrl(chain1.id);
  // }, [getFullRpcUrl]);

  const isChainAuthenticated = useCallback(
    (chainId: number) => {
      const rpcUrl = getFullRpcUrl(chainId);
      return rpcUrl ? true : false;
    },
    [getFullRpcUrl],
  );

  // Legacy isRpcAuthenticated for Chain A
  // const isRpcAuthenticated = useMemo(() => {
  //   return isChainAuthenticated(chain1.id);
  // }, [isChainAuthenticated]);

  // Chain-specific authentication status (reactive)
  const isChainAAuthenticated = useMemo(() => {
    return isChainAuthenticated(chain1.id);
  }, [isChainAuthenticated]);

  const isChainCAuthenticated = useMemo(() => {
    return isChainAuthenticated(chain3.id);
  }, [isChainAuthenticated]);

  const saveChainToWallet = useCallback(
    async (chainId: number) => {
      const targetChain = allChains.find(chain => chain.id === chainId);
      if (!targetChain) {
        throw new Error(`Chain with ID ${chainId} not found`);
      }

      const rpcUrl = getFullRpcUrl(chainId);
      if (!rpcUrl) {
        throw new Error(`User is not authenticated for chain ${chainId}`);
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
    [client, getFullRpcUrl],
  );

  // Convenience methods for specific chains
  const saveChainAToWallet = useCallback(() => saveChainToWallet(chain1.id), [saveChainToWallet]);
  const saveChainCToWallet = useCallback(() => saveChainToWallet(chain3.id), [saveChainToWallet]);

  return {
    // Legacy methods (Chain A)
    // isRpcAuthenticated,
    // auth,
    // fullRpcUrl,
    // saveChainToWallet,
    isLoginPending,
    logout,

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
