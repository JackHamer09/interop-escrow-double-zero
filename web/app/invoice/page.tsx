"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, Plus, RefreshCw } from "lucide-react";
import { Hash, parseUnits } from "viem";
import { useAccount, useChainId } from "wagmi";
import HiddenContent from "~~/components/HiddenContent";
import { CreateInvoiceModal, InvoiceFormState, InvoiceList, PayInvoiceModal } from "~~/components/Invoice";
import { TokenBalances } from "~~/components/Trade";
import { Alert, AlertDescription } from "~~/components/ui/alert";
import { Button } from "~~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~~/components/ui/tabs";
import { invoiceMainChain, invoiceSupportedChains, isInvoiceMainChain } from "~~/config/invoice-config";
import { defaultBillingToken, defaultPaymentToken } from "~~/config/invoice-config";
import { TokenConfig, getTokenByAddress, getTokenByAssetId } from "~~/config/tokens-config";
import useInvoiceContract, { Invoice } from "~~/hooks/use-invoice-contract";

export default function InvoicePaymentPage() {
  const [isRefreshingBalances, setIsRefreshingBalances] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [processingInvoiceId, setProcessingInvoiceId] = useState<bigint | undefined>(undefined);
  const [createdInvoices, setCreatedInvoices] = useState<Invoice[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedPaymentToken, setSelectedPaymentToken] = useState<`0x${string}` | null>(null);
  const [conversionAmount, setConversionAmount] = useState<bigint | null>(null);

  const {
    whitelistedTokens,
    createdInvoiceCount,
    pendingInvoiceCount,
    fetchCreatedInvoices,
    fetchPendingInvoices,
    getConversionAmount,
    refetchAll,
    refetchTokens,
    createInvoiceAsync,
    cancelInvoiceAsync,
    payInvoiceAsync,
    tokens,
  } = useInvoiceContract();

  const { address: myAddress } = useAccount();
  const walletChainId = useChainId();

  const mainChain = invoiceMainChain;
  const supportedChain = invoiceSupportedChains.find(chain => chain.id !== mainChain.id);

  if (!supportedChain) {
    throw new Error("No secondary chain configured");
  }

  // State for the invoice creation form
  const [invoiceState, setInvoiceState] = useState<InvoiceFormState>({
    recipientAddress: "",
    recipientChainId: supportedChain.id,
    billingToken: defaultBillingToken,
    amount: 0n,
    displayAmount: "",
  });
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);

  // Load invoices when counts change
  useEffect(() => {
    const loadInvoices = async () => {
      if (createdInvoiceCount && Number(createdInvoiceCount) > 0) {
        const invoices = await fetchCreatedInvoices();
        setCreatedInvoices(invoices);
      } else {
        setCreatedInvoices([]);
      }

      if (pendingInvoiceCount && Number(pendingInvoiceCount) > 0) {
        const invoices = await fetchPendingInvoices();
        setPendingInvoices(invoices);
      } else {
        setPendingInvoices([]);
      }
    };

    loadInvoices();
  }, [createdInvoiceCount, pendingInvoiceCount, fetchCreatedInvoices, fetchPendingInvoices]);

  // Update conversion amount when selected payment token changes
  useEffect(() => {
    const updateConversionAmount = async () => {
      if (selectedInvoice && selectedPaymentToken) {
        const amount = await getConversionAmount(
          selectedInvoice.billingToken,
          selectedPaymentToken,
          selectedInvoice.amount,
        );
        setConversionAmount(amount);
      } else {
        setConversionAmount(null);
      }
    };

    updateConversionAmount();
  }, [selectedInvoice, selectedPaymentToken, getConversionAmount]);

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
      // Get the token address for the chain
      const billingTokenAddress = invoiceState.billingToken.addresses[mainChain.id];

      if (!billingTokenAddress) {
        throw new Error("Token not supported on selected chain");
      }

      const result = await createInvoiceAsync(
        invoiceState.recipientAddress as `0x${string}`,
        invoiceState.recipientChainId,
        billingTokenAddress,
        invoiceState.amount,
      );

      // Only reset fields if successful
      if (result !== false) {
        setInvoiceState(prev => ({
          ...prev,
          recipientAddress: "",
          amount: 0n,
          displayAmount: "",
        }));
        setIsCreateModalOpen(false);
        refetchAll();
      }
    } finally {
      refetchTokens();
      setIsCreatingInvoice(false);
    }
  };

  const handleCancelInvoice = async (invoiceId: bigint) => {
    setIsCreatingInvoice(true);
    setProcessingInvoiceId(invoiceId);

    try {
      await cancelInvoiceAsync(invoiceId);
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
      setSelectedPaymentToken(defaultToken.addresses[mainChain.id]);
    }
    setIsPayModalOpen(true);
  };

  const handlePaymentTokenChange = (tokenAddress: `0x${string}`) => {
    setSelectedPaymentToken(tokenAddress);
  };

  const handlePayInvoice = async () => {
    if (!selectedInvoice || !selectedPaymentToken) return;

    setIsCreatingInvoice(true);
    setProcessingInvoiceId(selectedInvoice.id);

    try {
      await payInvoiceAsync(selectedInvoice, selectedPaymentToken);
      setIsPayModalOpen(false);
      refetchAll();
    } finally {
      refetchTokens();
      setIsCreatingInvoice(false);
      setProcessingInvoiceId(undefined);
    }
  };

  // State for managing the active tab
  const [activeTab, setActiveTab] = useState("pending");

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

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative w-full px-4">
      <div className="flex flex-col items-center w-full mt-10">
        <h2 className="mb-4 font-medium text-2xl text-center">Invoice Payment System</h2>

        <HiddenContent>
          <div className="w-full max-w-[1000px]">
            {/* Create Invoice Button and Info */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  disabled={!isInvoiceMainChain(walletChainId || 0)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Invoice
                </Button>

                {!isInvoiceMainChain(walletChainId || 0) && (
                  <Alert variant="warning" className="py-1 px-3 h-auto">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Switch to {mainChain.name} to create invoices
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={handleRefreshBalances}
                disabled={isRefreshingBalances}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshingBalances ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            {/* Tabs for Pending and Created Invoices */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-6">
              <TabsList className="w-full flex justify-start mb-4">
                <TabsTrigger value="pending">Pending Invoices</TabsTrigger>
                <TabsTrigger value="created">Created Invoices</TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="space-y-6">
                {/* Pending Invoices */}
                <InvoiceList
                  title="My Pending Invoices"
                  invoices={pendingInvoices}
                  myAddress={myAddress}
                  isProcessing={isCreatingInvoice}
                  processingInvoiceId={processingInvoiceId}
                  onPayInvoice={handleOpenPayModal}
                />
              </TabsContent>

              <TabsContent value="created">
                {/* Created Invoices */}
                <InvoiceList
                  title="Invoices I Created"
                  invoices={createdInvoices}
                  myAddress={myAddress}
                  isProcessing={isCreatingInvoice}
                  processingInvoiceId={processingInvoiceId}
                  onCancelInvoice={handleCancelInvoice}
                />
              </TabsContent>
            </Tabs>

            {/* Create Invoice Modal */}
            <CreateInvoiceModal
              isOpen={isCreateModalOpen}
              onClose={() => setIsCreateModalOpen(false)}
              invoiceState={invoiceState}
              isCreatingInvoice={isCreatingInvoice}
              onRecipientChange={handleRecipientChange}
              onTokenChange={handleTokenChange}
              onAmountChange={handleAmountChange}
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
