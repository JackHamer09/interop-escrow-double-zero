import { repoMainChain, repoSupportedChains } from "./repo-config";
import { invoiceSupportedTokens } from "./tokens-config";

// Supported chains for invoice payment system
export const invoiceMainChain = repoMainChain;
export const invoiceSupportedChains = repoSupportedChains;

// Check if a chain is the main invoice chain
export const isInvoiceMainChain = (chainId: number) => chainId === invoiceMainChain.id;

// Invoice status enum (must match the contract)
export enum InvoiceStatus {
  Created = 0,
  Paid = 1,
  Cancelled = 2
}

// Invoice data structure
export interface Invoice {
  id: bigint;
  creator: `0x${string}`;
  recipient: `0x${string}`;
  creatorChainId: bigint;
  recipientChainId: bigint;
  billingToken: `0x${string}`;
  amount: bigint;
  paymentToken: `0x${string}`;
  paymentAmount: bigint;
  status: InvoiceStatus;
  createdAt: bigint;
  paidAt: bigint;
}

// Default tokens for invoice payments
export const defaultBillingToken = invoiceSupportedTokens[0];
export const defaultPaymentToken = invoiceSupportedTokens[1];