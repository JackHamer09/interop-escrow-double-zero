import { useCallback, useEffect, useMemo, useState } from "react";
import { $fetch } from "ofetch";
import { SiweMessage } from "siwe";
import { addChain } from "viem/actions";
import { useAccount, useClient, useSignMessage } from "wagmi";
import { chain1 } from "~~/services/web3/wagmiConfig";
import { env } from "~~/utils/env";

const STORAGE_KEY = "rpc_auth";
const AUTH_API_URL = env.NEXT_PUBLIC_CHAIN_A_AUTH_API_URL;
const CHAIN1_BASE_RPC_URL = env.NEXT_PUBLIC_CHAIN_A_BASE_RPC_URL;

type AuthData = {
  address: string;
  rpcToken: string;
};

export const getStoredAuth = (): AuthData | null => {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
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
    if (auth && address && address !== auth.address) {
      console.log("Set auth to null");
      $fetch(`${AUTH_API_URL}/auth/logout`, { credentials: "include" }).catch(err => {
        console.error("Logout request failed", err);
      });
      setAuth(null);
      setStoredAuth(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-logout when address changes
  useEffect(() => {
    if (!address || auth?.address?.toLowerCase() !== address.toLowerCase()) {
      logout();
    }
  }, [address, auth?.address, logout]);

  /* TODO: uncomment later */
  const login = useCallback(async () => {
    if (!address) return;

    setIsLoginPending(true);

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

    const newAuth = { address, rpcToken: tokenRes.token };
    setAuth(newAuth);
    setStoredAuth(newAuth);
    setIsLoginPending(false);
  }, [address, signMessageAsync]);
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
    if (!auth?.rpcToken) return null;
    // return CHAIN1_BASE_RPC_URL; // TODO: remove later
    return `${CHAIN1_BASE_RPC_URL}/${auth.rpcToken}`;
  }, [auth?.rpcToken]);

  const isRpcAuthenticated = useMemo(() => {
    if (!auth) return false;
    return auth.address.toLowerCase() === address?.toLowerCase();
  }, [auth, address]);

  const saveChainToWallet = async () => {
    if (!isRpcAuthenticated || !fullRpcUrl) {
      throw new Error("User is not authenticated");
    }
    return await addChain(client as any, {
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
            url: "http://localhost:3010",
          },
        },
      },
    });
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
