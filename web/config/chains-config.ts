import { type Address, type Chain } from "viem";
import {
  L2_ASSET_ROUTER_ADDRESS,
  L2_INTEROP_CENTER_ADDRESS,
  L2_INTEROP_HANDLER_ADDRESS,
  L2_NATIVE_TOKEN_VAULT_ADDRESS,
  L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS,
} from "~~/utils/constants";
import { env } from "~~/utils/env";

export interface SystemContractsConfig {
  l2AssetRouter: Address;
  l2NativeTokenVault: Address;
  l2StandardTriggerAccount: Address;
  l2InteropHandler: Address;
  l2InteropCenter: Address;
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
  l2AssetRouter: L2_ASSET_ROUTER_ADDRESS,
  l2NativeTokenVault: L2_NATIVE_TOKEN_VAULT_ADDRESS,
  l2StandardTriggerAccount: L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS,
  l2InteropHandler: L2_INTEROP_HANDLER_ADDRESS,
  l2InteropCenter: L2_INTEROP_CENTER_ADDRESS,
};

// Helper functions
export function getChainById(chainId: number): Chain | undefined {
  return allChains.find(chain => chain.id === chainId);
}
