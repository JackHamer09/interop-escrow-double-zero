import React from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { Hash } from "viem";
import { Button } from "~~/components/ui/button";
import {
  Dialog,
  DialogClose,
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
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Create Invoice</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
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

          {/* Combined Amount and Token */}
          <div className="flex flex-col items-start gap-2">
            <Label className="text-right">Amount</Label>
            <div className="w-full grid grid-cols-[1fr_max-content] items-center overflow-hidden border border-input rounded-md">
              <input
                className="bg-background appearance-none focus:outline-none px-3 py-2 text-sm w-full"
                placeholder="0.0"
                value={invoiceState.displayAmount}
                onChange={onAmountChange}
              />

              <Select value={invoiceState.billingToken.assetId} onValueChange={value => onTokenChange(value as Hash)}>
                <SelectTrigger className="bg-secondary text-secondary-foreground shadow hover:bg-secondary/80 text-sm h-fit w-max border-none rounded-none px-3">
                  <SelectValue>
                    <div className="flex items-center gap-x-2">
                      <Image
                        src={invoiceState.billingToken.logo}
                        alt={invoiceState.billingToken.symbol}
                        width={16}
                        height={16}
                        className="rounded-full"
                      />
                      <span className="w-max">{invoiceState.billingToken.symbol}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {whitelistedTokens.map(token => (
                    <SelectItem key={token.assetId} value={token.assetId}>
                      <div className="flex items-center gap-x-2">
                        <Image src={token.logo} alt={token.symbol} width={16} height={16} className="rounded-full" />
                        <span className="truncate">{token.symbol}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
