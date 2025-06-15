import { chain1, chain2 } from "./chains-config";
import { allTokens } from "./tokens-config";
import { type Chain, getAddress } from "viem";
import { env } from "~~/utils/env";

// Escrow Trade-specific configuration
export const escrowMainChain = chain1;
export const escrowSupportedChains = [chain1, chain2];
export const escrowSupportedTokens = allTokens;

// Escrow Trade contract addresses
export const escrowContracts = {
  tradeEscrow: getAddress(env.NEXT_PUBLIC_TRADE_ESCROW_ADDRESS),
};

// Helper functions specific to escrow trade
export function isEscrowMainChain(chainId: number): boolean {
  return chainId === escrowMainChain.id;
}

export function getEscrowChainById(chainId: number): Chain | undefined {
  return escrowSupportedChains.find(chain => chain.id === chainId);
}
