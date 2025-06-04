import { Chain, getAddress } from "viem";
import { env } from "~~/utils/env";

export interface SystemContractsConfig {
  l2AssetRouter: string;
  l2NativeTokenVault: string;
  l2StandardTriggerAccount: string;
  l2InteropHandler: string;
  l2InteropCenter: string;
  deployerSystemContract: string;
}

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

// System contract addresses
export const systemContracts: SystemContractsConfig = {
  l2AssetRouter: getAddress("0x0000000000000000000000000000000000010003".toLowerCase()),
  l2NativeTokenVault: getAddress("0x0000000000000000000000000000000000010004".toLowerCase()),
  l2StandardTriggerAccount: getAddress("0x000000000000000000000000000000000001000d".toLowerCase()),
  l2InteropHandler: getAddress("0x000000000000000000000000000000000001000B".toLowerCase()),
  l2InteropCenter: getAddress("0x000000000000000000000000000000000001000A".toLowerCase()),
  deployerSystemContract: getAddress("0x0000000000000000000000000000000000008006".toLowerCase()),
};

// Helper functions
export function getChainById(chainId: number): Chain | undefined {
  return allChains.find(chain => chain.id === chainId);
}
