import React from "react";
import { TokenDisplay } from "../Trade";
import { Button } from "~~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~~/components/ui/dialog";
import { Label } from "~~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~~/components/ui/select";
import { TokenConfig } from "~~/config/tokens-config";
import { getTokenByAddress } from "~~/config/tokens-config";
import { Invoice } from "~~/hooks/use-invoice-contract";

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
  onPaymentTokenChange: (tokenAddress: `0x${string}`) => void;
  onSubmit: () => void;
  conversionAmount: bigint | null;
  selectedPaymentToken: `0x${string}` | null;
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
  const paymentToken = selectedPaymentToken ? getTokenByAddress(selectedPaymentToken) : null;

  // Find the token with balance info
  const selectedTokenWithBalance = paymentToken ? tokens.find(t => t.assetId === paymentToken.assetId) : null;

  const hasEnoughBalance =
    selectedTokenWithBalance && conversionAmount
      ? BigInt(selectedTokenWithBalance.balance || 0) >= conversionAmount
      : false;

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pay Invoice #{invoice.id.toString()}</DialogTitle>
          <DialogDescription>Choose a token to pay this invoice</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col items-start gap-2">
            <Label className="text-right">Billing Amount</Label>
            <div className="flex items-center p-2 border rounded-md border-input bg-background">
              {billingToken && <TokenDisplay token={billingToken} amount={invoice.amount} party={invoice.creator} />}
            </div>
          </div>

          <div className="flex flex-col items-start gap-2">
            <Label htmlFor="token" className="text-right">
              Pay With
            </Label>
            <Select
              value={selectedPaymentToken || ""}
              onValueChange={value => onPaymentTokenChange(value as `0x${string}`)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Token" />
              </SelectTrigger>
              <SelectContent>
                {whitelistedTokens.map(token => {
                  const tokenWithBalance = tokens.find(t => t.assetId === token.assetId);

                  // Determine which chain's token address to use
                  const tokenChainId = chainId || Number(Object.keys(token.addresses)[0]);
                  const tokenAddress = token.addresses[tokenChainId];

                  if (!tokenAddress) return null; // Skip tokens without an address for this chain

                  return (
                    <SelectItem key={token.assetId} value={tokenAddress}>
                      <div className="flex items-center justify-between w-full">
                        <span>{token.symbol}</span>
                        {tokenWithBalance && (
                          <span className="text-sm text-gray-500">
                            Balance: {parseFloat(tokenWithBalance.formattedBalance || "0").toFixed(4)}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {paymentToken && conversionAmount ? (
            <div className="flex flex-col items-start gap-2">
              <Label className="text-right">You Will Pay</Label>
              <div className="flex items-center p-2 border rounded-md border-input bg-background">
                <TokenDisplay token={paymentToken} amount={conversionAmount} party={invoice.recipient} />
              </div>

              {!hasEnoughBalance && <p className="text-sm text-red-500">Insufficient balance</p>}
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
