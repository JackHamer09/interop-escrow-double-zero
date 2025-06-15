import React from "react";
import { InvoiceItem } from "./InvoiceItem";
import { type Address } from "viem";
import { Card, CardContent } from "~~/components/ui/card";
import { Invoice } from "~~/hooks/use-invoice-contract";

interface InvoiceListProps {
  title: string;
  invoices: Invoice[];
  myAddress?: Address;
  isProcessing: boolean;
  processingInvoiceId?: bigint;
  onPayInvoice?: (invoice: Invoice) => void;
  onCancelInvoice?: (invoiceId: bigint) => void;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({
  title,
  invoices,
  myAddress,
  isProcessing,
  processingInvoiceId,
  onPayInvoice,
  onCancelInvoice,
}) => {
  return (
    <div className="mb-6">
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      {invoices.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-400">No invoices found</CardContent>
        </Card>
      ) : (
        <div>
          {invoices.map(invoice => (
            <InvoiceItem
              key={invoice.id.toString()}
              invoice={invoice}
              myAddress={myAddress}
              isProcessing={isProcessing && processingInvoiceId === invoice.id}
              onPayInvoice={onPayInvoice}
              onCancelInvoice={onCancelInvoice}
            />
          ))}
        </div>
      )}
    </div>
  );
};
