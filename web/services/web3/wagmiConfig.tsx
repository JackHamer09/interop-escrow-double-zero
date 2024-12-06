import { wagmiConnectors } from "./wagmiConnectors";
import { createWalletClient, custom } from "viem";
import { createConfig } from "wagmi";
import { env } from "~~/utils/env";

export const wagmiConfig = createConfig({
  chains: [
    {
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
    },
  ],
  connectors: wagmiConnectors,
  ssr: true,
  client: ({ chain }) =>
    createWalletClient({
      chain,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      transport: custom(window.ethereum!),
    }),
});
