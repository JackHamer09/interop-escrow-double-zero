import { createWalletClient, custom, http } from "viem";
import { createConfig } from "wagmi";
import { getStoredAuth } from "~~/hooks/use-rpc-login";
import { env } from "~~/utils/env";

export const chain1 = {
  id: env.NEXT_PUBLIC_CHAIN_1_ID,
  name: env.NEXT_PUBLIC_CHAIN_1_NAME,
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
  id: env.NEXT_PUBLIC_CHAIN_2_ID,
  name: env.NEXT_PUBLIC_CHAIN_2_NAME,
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

export const wagmiConfig = createConfig({
  chains: [chain1, chain2],
  ssr: true,
  client: ({ chain }) => {
    return createWalletClient({
      chain,
      transport: custom({
        async request({ method, params }) {
          // console.log({ chain: chain.id, method, params });
          if (params?.from || chain.id !== chain1.id) {
            // Signature request or non-chain1-requests
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const response = await window.ethereum!.request({ method, params });
            // console.log("window.ethereum response", { response });
            return response;
          }

          const auth = getStoredAuth();
          if (!auth) {
            console.warn("User is not authenticated");
            throw {
              code: -32001,
              message: "User is not authenticated",
            };
          }
          const rpcUrl = env.NEXT_PUBLIC_CHAIN1_BASE_RPC_URL;
          // const fullRpcUrl = rpcUrl;
          const fullRpcUrl = `${rpcUrl}/${auth.rpcToken}`; // TODO: uncomment later
          const provider = http(fullRpcUrl)({ chain });
          const response = await provider.request({ method, params });
          // console.log("http response", { response });
          return response;
        },
      }),
    });
  },
});
