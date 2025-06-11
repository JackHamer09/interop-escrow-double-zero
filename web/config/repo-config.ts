import { escrowMainChain, escrowSupportedChains, escrowSupportedTokens } from "./escrow-trade-config";
import { getAddress } from "viem";
import { env } from "~~/utils/env";

// Re-export the chains config to be used with repo
export const repoMainChain = escrowMainChain;
export const repoSupportedChains = escrowSupportedChains;
export const repoSupportedTokens = escrowSupportedTokens;

export const repoContracts = {
  repoContractAddress: getAddress(env.NEXT_PUBLIC_REPO_CONTRACT_ADDRESS),
};

// Helper function to check if chainId is the main chain
export function isRepoMainChain(chainId: number): boolean {
  return chainId === repoMainChain.id;
}

// Helper function to get chain by id
export function getRepoChainById(chainId: number) {
  return repoSupportedChains.find(chain => chain.id === chainId);
}

// Duration options for repo offers in seconds
export const repoDurationOptions = [
  { label: "2 minutes", value: 2 * 60 },
  { label: "30 minutes", value: 30 * 60 },
  { label: "1 hour", value: 60 * 60 },
  { label: "4 hours", value: 4 * 60 * 60 },
  { label: "8 hours", value: 8 * 60 * 60 },
  { label: "24 hours", value: 24 * 60 * 60 },
] as const;

// Enum for offer status
export enum RepoOfferStatus {
  Open = 0,
  Active = 1,
  Completed = 2,
  Cancelled = 3,
  Defaulted = 4,
}
