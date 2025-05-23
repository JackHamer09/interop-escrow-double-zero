"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { $fetch } from "ofetch";
import { SiweMessage } from "siwe";
import { addChain } from "viem/actions";
import { useAccount, useClient, useSignMessage } from "wagmi";
import { chain1 } from "~~/services/web3/wagmiConfig";
import { env } from "~~/utils/env";

const STORAGE_KEY = "rpc_auth";
const AUTH_API_URL = env.NEXT_PUBLIC_AUTH_API_URL;
const CHAIN1_BASE_RPC_URL = env.NEXT_PUBLIC_BASE_RPC_URL;

type AuthRecord = Record<string, string>; // address -> rpcToken

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
      // Convert old format to new format
      const oldAddress = parsed.address.toLowerCase();
      return {
        activeAddress: oldAddress,
        tokens: { [oldAddress]: parsed.rpcToken },
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

  /* TODO: uncomment later */
  const login = useCallback(async () => {
    if (!address) return;
    const lowerAddress = address.toLowerCase();

    // Check if we already have a token for this address
    if (auth?.tokens[lowerAddress]) {
      setAuth(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          activeAddress: lowerAddress,
        };
      });
      setStoredAuth({
        ...(auth || { tokens: {} }),
        activeAddress: lowerAddress,
      });
      return;
    }

    setIsLoginPending(true);

    try {
      const nonce = await $fetch<string>(`${AUTH_API_URL}/auth/nonce`, {
        credentials: "include",
      });

      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: "Sign in with Ethereum",
        uri: window.location.href,
        version: "1",
        chainId: chain1.id,
        nonce,
      }).prepareMessage();

      const signature = await signMessageAsync({ message });

      await $fetch(`${AUTH_API_URL}/auth/verify`, {
        method: "POST",
        body: { message, signature },
        credentials: "include",
      });

      const tokenRes = await $fetch<{ ok: true; token: string }>(`${AUTH_API_URL}/auth/token`, {
        credentials: "include",
      });

      const newTokens = { ...(auth?.tokens || {}) };
      newTokens[lowerAddress] = tokenRes.token;

      const newAuth = {
        activeAddress: lowerAddress,
        tokens: newTokens,
      };

      setAuth(newAuth);
      setStoredAuth(newAuth);
    } catch (error) {
      console.error("Login failed", error);
    } finally {
      setIsLoginPending(false);
    }
  }, [address, signMessageAsync, auth]);
  /* const login = useCallback(async () => {
    if (!address) return;

    setIsLoginPending(true);

    const message = new SiweMessage({
      domain: window.location.host,
      address,
      statement: "Sign in with Ethereum",
      uri: window.location.href,
      version: "1",
      chainId: chain1.id,
      nonce: generateNonce(),
    }).prepareMessage();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _signature = await signMessageAsync({ message });

    const newAuth = { address, rpcToken: "test" };
    setAuth(newAuth);
    setStoredAuth(newAuth);
    setIsLoginPending(false);
  }, [address, signMessageAsync]); */

  const fullRpcUrl = useMemo(() => {
    if (!auth?.activeAddress || !auth.tokens[auth.activeAddress]) return null;
    // return CHAIN1_BASE_RPC_URL; // TODO: remove later
    return `${CHAIN1_BASE_RPC_URL}/${auth.tokens[auth.activeAddress]}`;
  }, [auth?.activeAddress, auth?.tokens]);

  const isRpcAuthenticated = useMemo(() => {
    if (!auth?.activeAddress || !address) return false;
    const lowerAddress = address.toLowerCase();
    return auth.activeAddress === lowerAddress && !!auth.tokens[lowerAddress];
  }, [auth, address]);

  const saveChainToWallet = async () => {
    if (!isRpcAuthenticated || !fullRpcUrl) {
      throw new Error("User is not authenticated");
    }
    try {
      await addChain(client as any, {
        chain: {
          id: chain1.id,
          name: chain1.name,
          nativeCurrency: chain1.nativeCurrency,
          rpcUrls: {
            default: {
              http: [fullRpcUrl],
            },
          },
          blockExplorers: {
            default: {
              name: "Block Explorer",
              url: env.NEXT_PUBLIC_BLOCK_EXPLORER_URL,
            },
          },
        },
      });
    } catch (error) {
      console.warn(`Add network to wallet error: ${error}`);
    }
  };

  return {
    isRpcAuthenticated,
    isLoginPending,
    login,
    logout,
    auth,
    fullRpcUrl,
    saveChainToWallet,
  };
}
