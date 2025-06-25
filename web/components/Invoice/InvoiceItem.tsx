import React from "react";
import { TokenDisplay } from "../Trade/TokenDisplay";
import { CalendarIcon, CheckCircle, Clock, XCircle } from "lucide-react";
import { Address } from "viem";
import { Button } from "~~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~~/components/ui/card";
import { InvoiceStatus, invoiceSupportedChains } from "~~/config/invoice-config";
import { getTokenByAddress } from "~~/config/tokens-config";
import { Invoice } from "~~/hooks/use-invoice-contract";

interface InvoiceItemProps {
  invoice: Invoice;
  myAddress?: Address;
  isProcessing: boolean;
  onPayInvoice?: (invoice: Invoice) => void;
  onCancelInvoice?: (invoiceId: bigint) => void;
}

export const InvoiceItem: React.FC<InvoiceItemProps> = ({
  invoice,
  myAddress,
  isProcessing,
  onPayInvoice,
  onCancelInvoice,
}) => {
  const recipientChain = invoiceSupportedChains.find(chain => BigInt(chain.id) === invoice.recipientChainId);
  const creatorChain = invoiceSupportedChains.find(chain => BigInt(chain.id) === invoice.creatorChainId);

  const billingToken = getTokenByAddress(invoice.billingToken);
  const paymentToken = invoice.paymentToken !== "0x" ? getTokenByAddress(invoice.paymentToken) : null;

  const formattedDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString();
  };

  const getStatusDisplay = () => {
    switch (invoice.status) {
      case InvoiceStatus.Created:
        return (
          <div className="flex items-center text-yellow-500">
            <Clock className="w-4 h-4 mr-1" />
            <span>Pending</span>
          </div>
        );
      case InvoiceStatus.Paid:
        return (
          <div className="flex items-center text-green-500">
            <CheckCircle className="w-4 h-4 mr-1" />
            <span>Paid</span>
          </div>
        );
      case InvoiceStatus.Cancelled:
        return (
          <div className="flex items-center text-red-500">
            <XCircle className="w-4 h-4 mr-1" />
            <span>Cancelled</span>
          </div>
        );
      default:
        return <span>Unknown</span>;
    }
  };

  return (
    <Card className="mb-4 hover:bg-slate-400 hover:bg-opacity-5 border-slate-600">
      <CardHeader className="p-4 pb-3">
        <CardTitle className="text-muted-foreground text-sm font-normal">
          <div className="flex flex-col">
            <div className="flex justify-between">
              <div className="text-lg">Invoice #{invoice.id.toString()}</div>
              <div className="flex items-center gap-2">{getStatusDisplay()}</div>
            </div>

            <div className="flex mt-2 text-sm justify-between">
              <div>
                <span className="text-gray-400">From:</span> {invoice.creatorRefundAddress.slice(0, 6)}...
                {invoice.creatorRefundAddress.slice(-4)}
                <span className="ml-1 text-xs text-gray-500">({creatorChain?.name})</span>
              </div>
              <div>
                <span className="text-gray-400">To:</span> {invoice.recipientRefundAddress.slice(0, 6)}...
                {invoice.recipientRefundAddress.slice(-4)}
                <span className="ml-1 text-xs text-gray-500">({recipientChain?.name})</span>
              </div>
            </div>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-y-2 p-4 pt-0">
        <div className="flex justify-between items-center mb-2">
          <div className="flex flex-col">
            <div className="text-sm text-gray-400">Billing Amount</div>
            {billingToken && (
              <div className="flex items-center">
                <TokenDisplay
                  token={billingToken}
                  amount={invoice.amount}
                  party={invoice.creatorRefundAddress}
                  myAddress={myAddress}
                />
              </div>
            )}
          </div>

          {invoice.status === InvoiceStatus.Paid && paymentToken && (
            <div className="flex flex-col">
              <div className="text-sm text-gray-400">Paid With</div>
              <div className="flex items-center">
                <TokenDisplay
                  token={paymentToken}
                  amount={invoice.paymentAmount}
                  party={invoice.recipientRefundAddress}
                  myAddress={myAddress}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
          <CalendarIcon className="w-3 h-3" />
          <span>Created: {formattedDate(invoice.createdAt)}</span>

          {invoice.status === InvoiceStatus.Paid && (
            <>
              <span className="mx-1">•</span>
              <CalendarIcon className="w-3 h-3" />
              <span>Paid: {formattedDate(invoice.paidAt)}</span>
            </>
          )}
        </div>

        <div className="flex gap-4 items-center justify-center">
          {/* Pending invoice actions */}
          {invoice.status === InvoiceStatus.Created && (
            <>
              {invoice.creatorRefundAddress === myAddress && onCancelInvoice && (
                <Button
                  className="p-4"
                  variant="destructive"
                  loading={isProcessing}
                  onClick={() => onCancelInvoice(invoice.id)}
                >
                  Cancel Invoice
                </Button>
              )}
              {invoice.recipientRefundAddress === myAddress && onPayInvoice && (
                <Button className="p-4" loading={isProcessing} onClick={() => onPayInvoice(invoice)}>
                  Pay Invoice
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
