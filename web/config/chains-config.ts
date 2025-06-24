import { type Chain } from "viem";
import { env } from "~~/utils/env";

// Define chain configurations
export const chain1 = {
  id: env.NEXT_PUBLIC_CHAIN_A_ID,
  name: env.NEXT_PUBLIC_CHAIN_A_NAME,
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  blockExplorers: {
    default: {
      name: "Default Explorer",
      url: env.NEXT_PUBLIC_CHAIN_A_BLOCK_EXPLORER_URL,
    },
  },
  rpcUrls: {
    default: {
      http: [],
    },
  },
} as const satisfies Chain;

export const chain2 = {
  id: env.NEXT_PUBLIC_CHAIN_B_ID,
  name: env.NEXT_PUBLIC_CHAIN_B_NAME,
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  blockExplorers: {
    default: {
      name: "Default Explorer",
      url: env.NEXT_PUBLIC_CHAIN_B_BLOCK_EXPLORER_URL,
    },
  },
  rpcUrls: {
    default: {
      http: [],
    },
  },
} as const satisfies Chain;

// All available chains
export const allChains = [chain1, chain2] as const satisfies Chain[];

// Helper functions
export function getChainById(chainId: number): Chain | undefined {
  return allChains.find(chain => chain.id === chainId);
}
