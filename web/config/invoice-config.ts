import { chain3 } from "./chains-config";
import { escrowSupportedChains, escrowSupportedTokens } from "./escrow-trade-config";
import { Address, getAddress } from "viem";
import { env } from "~~/utils/env";

export const invoiceMainChain = chain3; // Invoice contract is deployed on Chain C
export const invoiceSupportedChains = escrowSupportedChains;
export const invoiceSupportedTokens = escrowSupportedTokens;

export const invoiceContracts = {
  invoiceContractAddress: getAddress(env.NEXT_PUBLIC_INVOICE_CONTRACT_ADDRESS),
};

// Check if a chain is the main invoice chain
export const isInvoiceMainChain = (chainId: number) => chainId === invoiceMainChain.id;

// Invoice status enum (must match the contract)
export enum InvoiceStatus {
  Created = 0,
  Paid = 1,
  Cancelled = 2,
}

// Invoice data structure
export interface Invoice {
  id: bigint;
  creator: Address;
  recipient: Address;
  creatorChainId: bigint;
  recipientChainId: bigint;
  billingToken: Address;
  amount: bigint;
  paymentToken: Address;
  paymentAmount: bigint;
  status: InvoiceStatus;
  createdAt: bigint;
  paidAt: bigint;
}

// Default tokens for invoice payments
export const defaultBillingToken = invoiceSupportedTokens[0];
export const defaultPaymentToken = invoiceSupportedTokens[1];
