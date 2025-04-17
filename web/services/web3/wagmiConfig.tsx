import { createWalletClient, custom } from "viem";
import { createConfig } from "wagmi";
import { env } from "~~/utils/env";

export const chain1 = {
  id: env.NEXT_PUBLIC_CHAIN_ID,
  name: env.NEXT_PUBLIC_CHAIN_NAME,
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
  client: ({ chain }) =>
    createWalletClient({
      chain,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      transport: custom(window.ethereum!),
    }),
});
