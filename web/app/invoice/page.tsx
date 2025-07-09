"use client";

import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Hash, parseUnits } from "viem";
import { useAccount } from "wagmi";
import HiddenContent from "~~/components/HiddenContent";
import { CreateInvoiceModal, InvoiceFormState, InvoiceTable, PayInvoiceModal } from "~~/components/Invoice";
import { TokenBalances } from "~~/components/Trade";
import { Button } from "~~/components/ui/button";
import { chain2 } from "~~/config/chains-config";
import { invoiceMainChain, invoiceSupportedChains } from "~~/config/invoice-config";
import { defaultBillingToken, defaultPaymentToken } from "~~/config/invoice-config";
import { TokenConfig, getTokenAddress, getTokenByAddress, getTokenByAssetId } from "~~/config/tokens-config";
import useInvoiceContract, { Invoice } from "~~/hooks/use-invoice-contract";

export default function InvoicePaymentPage() {
  const [isRefreshingBalances, setIsRefreshingBalances] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [processingInvoiceId, setProcessingInvoiceId] = useState<bigint | undefined>(undefined);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedPaymentToken, setSelectedPaymentToken] = useState<Hash | null>(null);
  const [conversionAmount, setConversionAmount] = useState<bigint | null>(null);

  const {
    whitelistedTokens,
    createdInvoices,
    pendingInvoices,
    getConversionAmount,
    refetchAll,
    refetchTokens,
    createInvoiceAsync,
    cancelInvoiceAsync,
    payInvoiceAsync,
    tokens,
  } = useInvoiceContract();

  const { address: myAddress } = useAccount();

  const mainChain = invoiceMainChain;
  const supportedChain = invoiceSupportedChains.find(chain => chain.id !== mainChain.id);

  if (!supportedChain) {
    throw new Error("No secondary chain configured");
  }

  // Set default recipient chain to Chain B (chain2)
  const defaultRecipientChain = invoiceSupportedChains.find(chain => chain.id === chain2.id) || supportedChain;

  // State for the invoice creation form
  const [invoiceState, setInvoiceState] = useState<InvoiceFormState>({
    recipientAddress: "",
    recipientChainId: defaultRecipientChain.id,
    billingToken: defaultBillingToken,
    amount: 0n,
    displayAmount: "",
    text: "",
  });
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);

  // Update conversion amount when selected payment token changes
  useEffect(() => {
    const updateConversionAmount = async () => {
      if (selectedInvoice && selectedPaymentToken) {
        // Get the payment token address on the main chain
        const paymentTokenAddress = getTokenAddress(selectedPaymentToken, mainChain.id);
        if (!paymentTokenAddress) {
          console.error("Payment token not available on main chain");
          return;
        }

        const amount = await getConversionAmount(
          selectedInvoice.billingToken,
          paymentTokenAddress,
          selectedInvoice.amount,
        );
        setConversionAmount(amount);
      } else {
        setConversionAmount(null);
      }
    };

    updateConversionAmount();
  }, [selectedInvoice, selectedPaymentToken, getConversionAmount, mainChain.id]);

  const handleRefreshBalances = async () => {
    setIsRefreshingBalances(true);
    try {
      await Promise.all([
        new Promise(resolve => setTimeout(resolve, 500)), // Simulate a delay
        refetchTokens(),
        refetchAll(),
      ]);
    } finally {
      setIsRefreshingBalances(false);
    }
  };

  const handleRecipientChange = (recipient: string) => {
    setInvoiceState(prev => ({
      ...prev,
      recipientAddress: recipient,
    }));
  };

  const handleTokenChange = (tokenAssetId: Hash) => {
    const selectedToken = getTokenByAssetId(tokenAssetId);
    if (!selectedToken) return;

    setInvoiceState(prev => ({
      ...prev,
      billingToken: selectedToken,
    }));
  };

  const isValidNumber = (value: string): boolean => {
    try {
      parseUnits(value, 18);
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amount = e.target.value.replace(/,/g, "");

    // Just update the specific input field, even if empty
    if (!amount) {
      setInvoiceState(prev => ({
        ...prev,
        amount: 0n,
        displayAmount: "",
      }));
      return;
    }

    if (!isValidNumber(amount)) return;

    setInvoiceState(prev => ({
      ...prev,
      amount: parseUnits(amount, 18),
      displayAmount: amount,
    }));
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInvoiceState(prev => ({
      ...prev,
      text: e.target.value,
    }));
  };

  const handleChainChange = (value: number) => {
    setInvoiceState(prev => ({
      ...prev,
      recipientChainId: value,
    }));
  };

  const handleCreateInvoice = async () => {
    // Check required fields
    if (invoiceState.amount === 0n || !invoiceState.recipientAddress.startsWith("0x")) {
      return;
    }

    setIsCreatingInvoice(true);
    try {
      // Get the token address for the main chain
      const billingTokenAddress = getTokenAddress(invoiceState.billingToken.assetId, mainChain.id);

      if (!billingTokenAddress) {
        throw new Error("Token not supported on main chain");
      }

      const result = await createInvoiceAsync(
        invoiceState.recipientAddress as `0x${string}`,
        invoiceState.recipientChainId,
        billingTokenAddress,
        invoiceState.amount,
        invoiceState.text,
      );

      // Only reset fields if successful
      if (result !== false) {
        setInvoiceState(prev => ({
          ...prev,
          recipientAddress: "",
          amount: 0n,
          displayAmount: "",
          text: "",
        }));
        setIsCreateModalOpen(false);
        refetchAll();
      }
    } finally {
      refetchTokens();
      setIsCreatingInvoice(false);
    }
  };

  const handleCancelInvoice = async (invoice: Invoice) => {
    setIsCreatingInvoice(true);
    setProcessingInvoiceId(invoice.id);

    try {
      await cancelInvoiceAsync(invoice);
      refetchAll();
    } finally {
      refetchTokens();
      setIsCreatingInvoice(false);
      setProcessingInvoiceId(undefined);
    }
  };

  const handleOpenPayModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    // Set default payment token if available
    if (whitelistedTokens && whitelistedTokens[0].length > 0) {
      const defaultToken = getTokenByAddress(invoice.billingToken) || defaultPaymentToken;
      setSelectedPaymentToken(defaultToken.assetId);
    }
    setIsPayModalOpen(true);
  };

  const handlePaymentTokenChange = (tokenAssetId: Hash) => {
    setSelectedPaymentToken(tokenAssetId);
  };

  const handlePayInvoice = async () => {
    if (!selectedInvoice || !selectedPaymentToken) return;

    // Get the payment token address on the main chain
    const paymentTokenAddress = getTokenAddress(selectedPaymentToken, mainChain.id);
    if (!paymentTokenAddress) {
      console.error("Payment token not available on main chain");
      return;
    }

    setIsCreatingInvoice(true);
    setProcessingInvoiceId(selectedInvoice.id);

    try {
      await payInvoiceAsync(selectedInvoice, paymentTokenAddress);
      setIsPayModalOpen(false);
      refetchAll();
    } finally {
      refetchTokens();
      setIsCreatingInvoice(false);
      setProcessingInvoiceId(undefined);
    }
  };

  // Format whitelist tokens data
  const formattedWhitelistedTokens = whitelistedTokens
    ? whitelistedTokens[0]
        .map((address, index) => {
          const token = getTokenByAddress(address as `0x${string}`);
          if (!token) return null;
          return {
            ...token,
            symbol: whitelistedTokens[1][index],
          };
        })
        .filter((token): token is TokenConfig => token !== null)
    : [];

  // Combine invoices locally for filtering
  const allInvoices = [...(createdInvoices || []), ...(pendingInvoices || [])].sort((a, b) =>
    Number(b.createdAt - a.createdAt),
  );

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative w-full px-4">
      <div className="flex flex-col items-center w-full mt-10">
        <h2 className="mb-4 font-medium text-2xl text-center">Invoice Payment System</h2>

        <HiddenContent>
          <div className="w-full max-w-[1000px]">
            {/* Create Invoice Button and Info */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Invoice
                </Button>
              </div>
            </div>

            {/* All Invoices Table */}
            <InvoiceTable
              title="Invoices"
              invoices={allInvoices}
              myAddress={myAddress}
              isProcessing={isCreatingInvoice}
              processingInvoiceId={processingInvoiceId}
              onPayInvoice={handleOpenPayModal}
              onCancelInvoice={handleCancelInvoice}
            />

            {/* Create Invoice Modal */}
            <CreateInvoiceModal
              isOpen={isCreateModalOpen}
              onClose={() => setIsCreateModalOpen(false)}
              invoiceState={invoiceState}
              isCreatingInvoice={isCreatingInvoice}
              onRecipientChange={handleRecipientChange}
              onTokenChange={handleTokenChange}
              onAmountChange={handleAmountChange}
              onTextChange={handleTextChange}
              onChainChange={handleChainChange}
              onSubmit={handleCreateInvoice}
              whitelistedTokens={formattedWhitelistedTokens}
            />

            {/* Pay Invoice Modal */}
            <PayInvoiceModal
              isOpen={isPayModalOpen}
              onClose={() => setIsPayModalOpen(false)}
              invoice={selectedInvoice}
              whitelistedTokens={formattedWhitelistedTokens}
              tokens={tokens}
              isProcessing={isCreatingInvoice}
              onPaymentTokenChange={handlePaymentTokenChange}
              onSubmit={handlePayInvoice}
              conversionAmount={conversionAmount}
              selectedPaymentToken={selectedPaymentToken}
            />
          </div>

          {/* Token Balances Section */}
          <TokenBalances
            tokens={tokens}
            isRefreshing={isRefreshingBalances}
            onRefresh={handleRefreshBalances}
            onMintSuccess={refetchTokens}
          />
        </HiddenContent>
      </div>
    </div>
  );
}
