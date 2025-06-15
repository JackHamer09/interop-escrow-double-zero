import React from "react";
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
import { Label } from "~~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~~/components/ui/select";
import { invoiceSupportedChains } from "~~/config/invoice-config";
import { TokenConfig } from "~~/config/tokens-config";

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceState: InvoiceFormState;
  isCreatingInvoice: boolean;
  onRecipientChange: (recipient: string) => void;
  onTokenChange: (tokenAssetId: Hash) => void;
  onAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onChainChange: (value: number) => void;
  onSubmit: () => void;
  whitelistedTokens: TokenConfig[];
}

export interface InvoiceFormState {
  recipientAddress: string;
  recipientChainId: number;
  billingToken: TokenConfig;
  amount: bigint;
  displayAmount: string;
}

export const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  isOpen,
  onClose,
  invoiceState,
  isCreatingInvoice,
  onRecipientChange,
  onTokenChange,
  onAmountChange,
  onChainChange,
  onSubmit,
  whitelistedTokens,
}) => {
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onRecipientChange(e.target.value);
  };

  const isFormValid = () => {
    return (
      invoiceState.recipientAddress.startsWith("0x") &&
      invoiceState.recipientAddress.length === 42 &&
      invoiceState.amount > 0n
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>Create a new invoice to bill another address</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          {/* Recipient address */}
          <div className="flex flex-col items-start gap-2">
            <Label htmlFor="recipient" className="text-right">
              Recipient Address
            </Label>
            <input
              id="recipient"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors"
              placeholder="0x..."
              value={invoiceState.recipientAddress}
              onChange={handleAddressChange}
            />
          </div>

          {/* Recipient Chain */}
          <div className="flex flex-col items-start gap-2">
            <Label htmlFor="recipientChain" className="text-right">
              Recipient Chain
            </Label>
            <Select
              value={invoiceState.recipientChainId.toString()}
              onValueChange={value => onChainChange(Number(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Chain" />
              </SelectTrigger>
              <SelectContent>
                {invoiceSupportedChains.map(chain => (
                  <SelectItem key={chain.id} value={chain.id.toString()}>
                    {chain.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Token selection */}
          <div className="flex flex-col items-start gap-2">
            <Label htmlFor="token" className="text-right">
              Billing Token
            </Label>
            <Select value={invoiceState.billingToken.assetId} onValueChange={value => onTokenChange(value as Hash)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Token" />
              </SelectTrigger>
              <SelectContent>
                {whitelistedTokens.map(token => (
                  <SelectItem key={token.assetId} value={token.assetId}>
                    {token.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="flex flex-col items-start gap-2">
            <Label htmlFor="amount" className="text-right">
              Amount
            </Label>
            <div className="relative w-full">
              <input
                id="amount"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors"
                placeholder="0.0"
                value={invoiceState.displayAmount}
                onChange={onAmountChange}
              />
              <div className="absolute inset-y-0 right-3 flex items-center">
                <span className="text-muted-foreground text-sm">{invoiceState.billingToken.symbol}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!isFormValid() || isCreatingInvoice} loading={isCreatingInvoice}>
            Create Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
