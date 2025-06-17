import { chain1, chain2 } from "./chains-config";
import { type Address, type Hash, getAddress } from "viem";
import { env } from "~~/utils/env";

export interface TokenConfig {
  symbol: string;
  name: string;
  assetId: Hash;
  decimals: number;
  logo: string;
  addresses: Record<number, Address>; // Chain ID -> Address mapping
}

// Define token configurations
export const usdcToken: TokenConfig = {
  symbol: "USDC",
  name: "USD Coin",
  assetId: env.NEXT_PUBLIC_USDC_ASSET_ID as Hash,
  decimals: 18,
  logo: "/usdc.webp",
  addresses: {
    [chain1.id]: getAddress(env.NEXT_PUBLIC_USDC_CHAIN_A_ADDRESS),
    [chain2.id]: getAddress(env.NEXT_PUBLIC_USDC_CHAIN_B_ADDRESS),
  },
};

export const ttbillToken: TokenConfig = {
  symbol: "TTBILL",
  name: "Tokenized Treasury Bill",
  assetId: env.NEXT_PUBLIC_TTBILL_ASSET_ID as Hash,
  decimals: 18,
  logo: "/ttbill.png",
  addresses: {
    [chain1.id]: getAddress(env.NEXT_PUBLIC_TTBILL_CHAIN_A_ADDRESS),
    [chain2.id]: getAddress(env.NEXT_PUBLIC_TTBILL_CHAIN_B_ADDRESS),
  },
};

export const sgdToken: TokenConfig = {
  symbol: "SGD",
  name: "Singapore Dollar",
  assetId: env.NEXT_PUBLIC_SGD_ASSET_ID as Hash, // Define this in your env
  decimals: 18,
  logo: "/sgd.png", // Add a SGD logo to your assets
  addresses: {
    [chain1.id]: getAddress(env.NEXT_PUBLIC_SGD_CHAIN_A_ADDRESS || "0x0"), // Replace with actual address
    [chain2.id]: getAddress(env.NEXT_PUBLIC_SGD_CHAIN_B_ADDRESS || "0x0"), // Replace with actual address
  },
};

// All available tokens
export const allTokens: TokenConfig[] = [usdcToken, ttbillToken, sgdToken];

// Helper functions
export function getTokenByAssetId(assetId: string): TokenConfig | undefined {
  return allTokens.find(token => token.assetId === assetId);
}

export function getTokenByAddress(address: Address, chainId?: number): TokenConfig | undefined {
  const normalizedAddress = getAddress(address);

  if (chainId) {
    return allTokens.find(token => token.addresses[chainId] === normalizedAddress);
  }

  return allTokens.find(token => Object.values(token.addresses).some(addr => addr === normalizedAddress));
}

export function getTokenAddress(assetId: string, chainId: number): Address | undefined {
  const token = getTokenByAssetId(assetId);
  return token?.addresses[chainId];
}
