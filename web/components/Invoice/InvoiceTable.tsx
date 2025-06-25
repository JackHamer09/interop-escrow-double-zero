import React, { useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Address } from "viem";
import { ShortAddress } from "~~/components/Trade/ShortAddress";
import { Badge } from "~~/components/ui/badge";
import { Button } from "~~/components/ui/button";
import { InvoiceStatus, invoiceSupportedChains } from "~~/config/invoice-config";
import { getTokenByAddress } from "~~/config/tokens-config";
import { Invoice } from "~~/hooks/use-invoice-contract";
import { formatAmount } from "~~/utils/format";

interface InvoiceTableProps {
  title: string;
  invoices: Invoice[];
  myAddress?: Address;
  isProcessing: boolean;
  processingInvoiceId?: bigint;
  onPayInvoice?: (invoice: Invoice) => void;
  onCancelInvoice?: (invoice: Invoice) => void;
  showFilters?: boolean;
}

export const InvoiceTable: React.FC<InvoiceTableProps> = ({
  title,
  invoices,
  myAddress,
  isProcessing,
  processingInvoiceId,
  onPayInvoice,
  onCancelInvoice,
  showFilters = false,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Format timestamp to date and time
  const formatTimestamp = (timestamp: bigint) => {
    if (timestamp === 0n) return "N/A";
    const date = new Date(Number(timestamp) * 1000);
    return format(date, "MMM d, yyyy HH:mm");
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.Created:
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case InvoiceStatus.Paid:
        return <Badge className="bg-green-500">Paid</Badge>;
      case InvoiceStatus.Cancelled:
        return <Badge className="bg-red-500">Cancelled</Badge>;
      default:
        return <Badge className="bg-gray-500">Unknown</Badge>;
    }
  };

  // Filter invoices based on status
  const filteredInvoices = React.useMemo(() => {
    if (!invoices) return [];

    return invoices.filter(invoice => {
      // Filter by status
      if (statusFilter !== "all") {
        const statusValue = parseInt(statusFilter);
        if (invoice.status !== statusValue) {
          return false;
        }
      }
      return true;
    });
  }, [invoices, statusFilter]);

  if (!invoices || invoices.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-medium mb-4 flex items-center gap-2">{title}</h2>
        <div className="border rounded-lg p-8 text-center text-gray-400">No invoices found</div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-medium flex items-center gap-2">{title}</h2>

        {showFilters && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Status:</span>
              <select
                className="bg-background border border-input px-3 py-1 rounded-md text-sm"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value={InvoiceStatus.Created.toString()}>Pending</option>
                <option value={InvoiceStatus.Paid.toString()}>Paid</option>
                <option value={InvoiceStatus.Cancelled.toString()}>Cancelled</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {filteredInvoices.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-gray-400">No invoices match your filters</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">From</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">To</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredInvoices.map(invoice => {
                const billingToken = getTokenByAddress(invoice.billingToken);
                const paymentToken = invoice.paymentToken !== "0x" ? getTokenByAddress(invoice.paymentToken) : null;

                const recipientChain = invoiceSupportedChains.find(
                  chain => BigInt(chain.id) === invoice.recipientChainId,
                );
                const creatorChain = invoiceSupportedChains.find(chain => BigInt(chain.id) === invoice.creatorChainId);

                return (
                  <tr key={invoice.id.toString()} className="hover:bg-gray-800/30">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium">#{invoice.id.toString()}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {invoice.creatorRefundAddress === myAddress ? (
                          <span className="text-blue-400">You</span>
                        ) : (
                          <ShortAddress address={invoice.creatorRefundAddress} isRight={false} />
                        )}
                        <span className="ml-1 text-xs text-gray-500">({creatorChain?.name})</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {invoice.recipientRefundAddress === myAddress ? (
                          <span className="text-blue-400">You</span>
                        ) : (
                          <ShortAddress address={invoice.recipientRefundAddress} isRight={false} />
                        )}
                        <span className="ml-1 text-xs text-gray-500">({recipientChain?.name})</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {billingToken && (
                          <>
                            <Image
                              src={billingToken.logo}
                              alt={billingToken.symbol}
                              width={20}
                              height={20}
                              className="rounded-full mr-2"
                            />
                            <div className="text-sm">
                              {formatAmount(invoice.amount, billingToken.decimals)} {billingToken.symbol}
                            </div>
                          </>
                        )}
                      </div>
                      {invoice.status === InvoiceStatus.Paid && paymentToken && (
                        <div className="text-xs text-gray-400 mt-1">
                          Paid with: {formatAmount(invoice.paymentAmount, paymentToken.decimals)} {paymentToken.symbol}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-1 inline" />
                        {formatTimestamp(invoice.createdAt)}
                      </div>
                      {invoice.status === InvoiceStatus.Paid && (
                        <div className="text-xs text-gray-400 mt-1">Paid: {formatTimestamp(invoice.paidAt)}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">{getStatusBadge(invoice.status)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      {invoice.status === InvoiceStatus.Created && (
                        <>
                          {invoice.creatorRefundAddress === myAddress && onCancelInvoice && (
                            <Button
                              variant="destructive"
                              size="sm"
                              loading={isProcessing && processingInvoiceId === invoice.id}
                              onClick={() => onCancelInvoice(invoice)}
                            >
                              Cancel
                            </Button>
                          )}
                          {invoice.recipientRefundAddress === myAddress && onPayInvoice && (
                            <Button
                              size="sm"
                              loading={isProcessing && processingInvoiceId === invoice.id}
                              onClick={() => onPayInvoice(invoice)}
                            >
                              Pay
                            </Button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
