import React from "react";
import Image from "next/image";
import { ShortAddress } from "../Trade/ShortAddress";
import { ArrowRight, Wallet } from "lucide-react";
import { Hash } from "viem";
import { Button } from "~~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~~/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~~/components/ui/select";
import { TokenConfig } from "~~/config/tokens-config";
import { getTokenByAddress, getTokenByAssetId } from "~~/config/tokens-config";
import { Invoice } from "~~/hooks/use-invoice-contract";
import { formatAmount } from "~~/utils/format";

interface TokenWithBalance extends TokenConfig {
  balance?: bigint;
  formattedBalance?: string;
}

interface PayInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  whitelistedTokens: TokenConfig[];
  tokens: TokenWithBalance[]; // Tokens with balances
  isProcessing: boolean;
  onPaymentTokenChange: (tokenAssetId: Hash) => void;
  onSubmit: () => void;
  conversionAmount: bigint | null;
  selectedPaymentToken: Hash | null;
  chainId?: number; // Optional chainId to determine which token address to use
}

export const PayInvoiceModal: React.FC<PayInvoiceModalProps> = ({
  isOpen,
  onClose,
  invoice,
  whitelistedTokens,
  tokens,
  isProcessing,
  onPaymentTokenChange,
  onSubmit,
  conversionAmount,
  selectedPaymentToken,
  chainId,
}) => {
  if (!invoice) return null;

  const billingToken = getTokenByAddress(invoice.billingToken);
  const paymentToken = selectedPaymentToken ? getTokenByAssetId(selectedPaymentToken) : null;

  // Find the token with balance info
  const selectedTokenWithBalance = paymentToken ? tokens.find(t => t.assetId === paymentToken.assetId) : null;

  const hasEnoughBalance =
    selectedTokenWithBalance && conversionAmount
      ? BigInt(selectedTokenWithBalance.balance || 0) >= conversionAmount
      : false;

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pay Invoice #{invoice.id.toString()}</DialogTitle>
          <DialogDescription>Choose a token to pay this invoice</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-4">
          {/* Invoice information */}
          <div className="rounded-lg border p-4 bg-secondary/10">
            <div className="flex justify-between items-center mb-3">
              <div className="text-sm text-muted-foreground">Billed by</div>
              <div className="text-sm">
                <ShortAddress address={invoice.creatorRefundAddress} isRight={false} />
              </div>
            </div>

            <div className="flex justify-between items-center mb-1">
              <div className="text-sm text-muted-foreground">Invoice amount</div>
              <div className="flex items-center gap-2">
                {billingToken && (
                  <>
                    <Image
                      src={billingToken.logo}
                      alt={billingToken.symbol}
                      width={18}
                      height={18}
                      className="rounded-full"
                    />
                    <span className="font-medium">
                      {formatAmount(invoice.amount, billingToken.decimals)} {billingToken.symbol}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Payment selection */}
          <div className="rounded-lg border p-4">
            <div className="flex justify-between items-center mb-3">
              <div className="text-sm font-medium">Pay with</div>

              {selectedTokenWithBalance && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <Wallet className="h-3 w-3 mr-1" />
                  <span>
                    Balance: {formatAmount(selectedTokenWithBalance.balance || 0n, selectedTokenWithBalance.decimals)}
                  </span>
                </div>
              )}
            </div>

            <Select value={selectedPaymentToken || ""} onValueChange={value => onPaymentTokenChange(value as Hash)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Token" />
              </SelectTrigger>
              <SelectContent>
                {whitelistedTokens.map(token => {
                  // Determine which chain's token address to use for display purposes
                  const tokenChainId = chainId || Number(Object.keys(token.addresses)[0]);
                  const tokenAddress = token.addresses[tokenChainId];
                  if (!tokenAddress) return null; // Skip tokens without an address for this chain

                  return (
                    <SelectItem key={token.assetId} value={token.assetId}>
                      <div className="flex items-center gap-2">
                        <Image src={token.logo} alt={token.symbol} width={20} height={20} className="rounded-full" />
                        <span>{token.symbol}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Payment details */}
          {paymentToken && conversionAmount ? (
            <div className="rounded-lg border p-4">
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium">Payment details</div>
                </div>

                <div className="flex items-center justify-center gap-4 py-2">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-1">
                      {billingToken && (
                        <>
                          <Image
                            src={billingToken.logo}
                            alt={billingToken.symbol}
                            width={24}
                            height={24}
                            className="rounded-full"
                          />
                          <span className="text-lg font-medium">
                            {formatAmount(invoice.amount, billingToken.decimals)}
                          </span>
                          <span>{billingToken.symbol}</span>
                        </>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">Invoice Amount</span>
                  </div>

                  <ArrowRight className="text-muted-foreground" size={20} />

                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-1">
                      {paymentToken && (
                        <>
                          <Image
                            src={paymentToken.logo}
                            alt={paymentToken.symbol}
                            width={24}
                            height={24}
                            className="rounded-full"
                          />
                          <span className="text-lg font-medium">
                            {formatAmount(conversionAmount, paymentToken.decimals)}
                          </span>
                          <span>{paymentToken.symbol}</span>
                        </>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">You Pay</span>
                  </div>
                </div>

                {!hasEnoughBalance && (
                  <div className="flex items-center justify-center text-sm text-red-500 mt-1 bg-red-500/10 py-1 px-2 rounded">
                    Insufficient balance
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!selectedPaymentToken || !hasEnoughBalance || isProcessing}
            loading={isProcessing}
          >
            Pay Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
