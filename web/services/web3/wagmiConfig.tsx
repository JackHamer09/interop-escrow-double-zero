import { createWalletClient, custom, http } from "viem";
import { createConfig } from "wagmi";
import { metaMask } from "wagmi/connectors";
import { getStoredAuth } from "~~/hooks/use-rpc-login";
import { env } from "~~/utils/env";

export const chain1 = {
  id: env.NEXT_PUBLIC_CHAIN_A_ID,
  name: env.NEXT_PUBLIC_CHAIN_A_NAME,
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [],
    },
  },
} as const;

export const chain2 = {
  id: env.NEXT_PUBLIC_CHAIN_B_ID,
  name: env.NEXT_PUBLIC_CHAIN_B_NAME,
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [],
    },
  },
} as const;

/**
 * Helper function to check if MetaMask is available
 */
export const isMetaMaskAvailable = () => {
  return typeof window !== "undefined" && typeof window.ethereum !== "undefined" && window.ethereum.isMetaMask;
};

/**
 * Creates a wallet client for the specified chain
 */
export const createMetaMaskClient = ({ chain }: { chain: typeof chain1 | typeof chain2 }) => {
  return createWalletClient({
    chain,
    pollingInterval: 500,
    transport: custom({
      async request({ method, params }) {
        if (!isMetaMaskAvailable()) {
          throw new Error("MetaMask is not available");
        }

        if (params?.from || chain.id !== chain1.id || method === "wallet_addEthereumChain") {
          // Signature request or non-chain1-requests
          const response = await window.ethereum!.request({ method, params });
          return response;
        }

        const walletChainId: number =
          (await window.ethereum
            ?.request({ method: "eth_chainId" })
            .then((res: string) => parseInt(res, 16))
            .catch(() => 0)) || 0;
        if (walletChainId === chain1.id) {
          try {
            const response = await window.ethereum!.request({ method, params });
            return response;
          } catch (error) {
            console.warn(
              "Tried to request through wallet but failed",
              { clientChain: chain.id, method, params },
              (error as any)?.data?.message,
            );
          }
        }

        const auth = getStoredAuth();
        if (!auth || !auth.activeAddress || !auth.tokens[auth.activeAddress]) {
          throw {
            code: -32001,
            message: "User is not authenticated",
          };
        }
        const rpcUrl = env.NEXT_PUBLIC_CHAIN_A_BASE_RPC_URL;
        const fullRpcUrl = `${rpcUrl}/${auth.tokens[auth.activeAddress]}`;
        const provider = http(fullRpcUrl)({ chain });
        const response = await provider.request({ method, params });
        return response;
      },
    }),
  });
};

export const wagmiConfig = createConfig({
  chains: [chain1, chain2],
  connectors: [metaMask()],
  client: createMetaMaskClient,
});
