"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { useBoolean } from "usehooks-ts";
import { Address, Hash, parseUnits } from "viem";
import { useAccount, useChainId } from "wagmi";
import HiddenContent from "~~/components/HiddenContent";
import { CreateOfferModal, RepoHistoryTable, RepoTable } from "~~/components/Repo";
import { TokenBalances } from "~~/components/Trade";
import { Button } from "~~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~~/components/ui/tabs";
import { RepoOfferStatus, repoDurationOptions, repoMainChain, repoSupportedChains } from "~~/config/repo-config";
import { repoSupportedTokens } from "~~/config/repo-config";
import { TokenConfig, getTokenByAssetId } from "~~/config/tokens-config";
import useRepoContract, { RepoOffer } from "~~/hooks/use-repo-contract";

interface RepoOfferState {
  chainA: number;
  chainB: number;
  lendToken: TokenConfig;
  collateralToken: TokenConfig;
  lendAmount: bigint;
  collateralAmount: bigint;
  displayLendAmount: string;
  displayCollateralAmount: string;
  duration: number;
  lenderFee: bigint;
  displayLenderFee: string;
}

export default function IntradayRepo() {
  const [isRefreshingBalances, setIsRefreshingBalances] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [processingOfferId, setProcessingOfferId] = useState<bigint | undefined>(undefined);

  const {
    openOffers,
    lenderOffers,
    borrowerOffers,
    historicalOffers,
    refetchAll: refetchOffers,
    refetchTokens,
    createOfferAsync,
    cancelOfferAsync,
    acceptOfferAsync,
    repayLoanAsync,
    claimCollateralAsync,
    tokens,
    gracePeriod,
  } = useRepoContract();

  const { address: myAddress } = useAccount();
  const walletChainId = useChainId();

  // Get supported tokens from configuration
  if (repoSupportedTokens.length < 2) {
    throw new Error("At least two supported tokens are required");
  }

  // Default to first two tokens if available
  const defaultLendToken = repoSupportedTokens[0];
  const defaultCollateralToken = repoSupportedTokens[1];

  const mainChain = repoMainChain;
  const supportedChain = repoSupportedChains.find(chain => chain.id !== mainChain.id);

  if (!supportedChain) {
    throw new Error("No secondary chain configured");
  }

  const [offerState, setOfferState] = useState<RepoOfferState>({
    chainA: mainChain.id,
    chainB: supportedChain.id,
    lendToken: defaultLendToken,
    collateralToken: defaultCollateralToken,
    lendAmount: 0n,
    collateralAmount: 0n,
    displayLendAmount: "",
    displayCollateralAmount: "",
    duration: repoDurationOptions[0].value,
    lenderFee: 3n,
    displayLenderFee: "3",
  });
  const { value: isCreatingOffer, setValue: setIsCreatingOffer } = useBoolean(false);

  // Find token balances for the selected tokens
  const lendTokenWithBalance = tokens.find(token => token.assetId === offerState.lendToken.assetId);
  const collateralTokenWithBalance = tokens.find(token => token.assetId === offerState.collateralToken.assetId);

  const lendTokenBalance = lendTokenWithBalance?.balance || 0n;
  const collateralTokenBalance = collateralTokenWithBalance?.balance || 0n;

  const handleRefreshBalances = async () => {
    setIsRefreshingBalances(true);
    try {
      await Promise.all([
        new Promise(resolve => setTimeout(resolve, 500)), // Simulate a delay
        refetchTokens(),
      ]);
    } finally {
      setIsRefreshingBalances(false);
    }
  };

  const handleTokenChange = (tokenAssetId: Hash, tokenType: "lendToken" | "collateralToken") => {
    const newSelectedToken = getTokenByAssetId(tokenAssetId);
    if (!newSelectedToken) return;

    const currentlySelectedToken = offerState[tokenType];
    // Get the token that would be the opposite (to ensure we don't use the same token twice)
    const otherTokenType = tokenType === "lendToken" ? "collateralToken" : "lendToken";
    const currentlySelectedOtherToken = offerState[otherTokenType];

    // If the selected token is the same as the other token, switch them in places
    if (newSelectedToken.assetId === currentlySelectedOtherToken.assetId) {
      setOfferState(prev => ({
        ...prev,
        [tokenType]: currentlySelectedOtherToken,
        [otherTokenType]: currentlySelectedToken,
      }));
    } else {
      setOfferState(prev => ({
        ...prev,
        [tokenType]: newSelectedToken,
      }));
    }
  };

  const isValidNumber = (value: string): boolean => {
    try {
      parseUnits(value, 18);
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>, tokenType: "lendToken" | "collateralToken") => {
    const amount = e.target.value.replace(/,/g, "");

    // Just update the specific input field, even if empty
    if (!amount) {
      setOfferState(prev => ({
        ...prev,
        [tokenType === "lendToken" ? "lendAmount" : "collateralAmount"]: 0n,
        [tokenType === "lendToken" ? "displayLendAmount" : "displayCollateralAmount"]: "",
      }));
      return;
    }

    if (!isValidNumber(amount)) return;

    setOfferState(prev => ({
      ...prev,
      [tokenType === "lendToken" ? "lendAmount" : "collateralAmount"]: parseUnits(amount, 18),
      [tokenType === "lendToken" ? "displayLendAmount" : "displayCollateralAmount"]: amount,
    }));
  };

  const handleFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fee = e.target.value.replace(/,/g, "");

    // Just update the fee field, even if empty
    if (!fee) {
      setOfferState(prev => ({
        ...prev,
        lenderFee: 0n,
        displayLenderFee: "",
      }));
      return;
    }

    // Parse fee as basis points directly
    const feeAsNumber = parseFloat(fee);
    if (isNaN(feeAsNumber) || feeAsNumber < 0 || feeAsNumber > 10000) return;

    setOfferState(prev => ({
      ...prev,
      lenderFee: BigInt(Math.round(feeAsNumber)), // Use basis points directly
      displayLenderFee: fee,
    }));
  };

  const handleDurationChange = (value: number) => {
    setOfferState(prev => ({
      ...prev,
      duration: value,
    }));
  };

  const handleCreateOffer = async () => {
    // Check required fields
    if (offerState.lendAmount === 0n || offerState.collateralAmount === 0n) {
      return;
    }

    setIsCreatingOffer(true);
    try {
      // Get the token addresses for the respective chains
      const lendTokenAddress = offerState.lendToken.addresses[mainChain.id];
      const collateralTokenAddress = offerState.collateralToken.addresses[mainChain.id];

      if (!lendTokenAddress || !collateralTokenAddress) {
        throw new Error("Token not supported on selected chain");
      }

      const result = await createOfferAsync(
        lendTokenAddress,
        offerState.lendAmount,
        collateralTokenAddress,
        offerState.collateralAmount,
        BigInt(offerState.duration),
        offerState.chainA,
        myAddress as Address,
        offerState.lenderFee,
      );

      // Only reset amount fields if the offer was successful (not false)
      if (result !== false) {
        setOfferState(prev => ({
          ...prev,
          lendAmount: 0n,
          collateralAmount: 0n,
          displayLendAmount: "",
          displayCollateralAmount: "",
          lenderFee: 3n,
          displayLenderFee: "3",
        }));
        setIsCreateModalOpen(false);
      }
    } finally {
      refetchTokens();
      refetchOffers();
      setIsCreatingOffer(false);
    }
  };

  const handleCancelOffer = async (offerId: bigint) => {
    setIsCreatingOffer(true);
    setProcessingOfferId(offerId);

    try {
      await cancelOfferAsync(offerId);
    } finally {
      refetchTokens();
      refetchOffers();
      setIsCreatingOffer(false);
      setProcessingOfferId(undefined);
    }
  };

  const handleAcceptOffer = async (offer: RepoOffer) => {
    setIsCreatingOffer(true);
    setProcessingOfferId(offer.offerId);

    try {
      await acceptOfferAsync(
        offer.offerId,
        walletChainId || mainChain.id, // Use current wallet chain or default to main chain
        myAddress as Address, // Use current address as refund address
      );
    } finally {
      refetchTokens();
      refetchOffers();
      setIsCreatingOffer(false);
      setProcessingOfferId(undefined);
    }
  };

  const handleRepayLoan = async (offerId: bigint) => {
    setIsCreatingOffer(true);
    setProcessingOfferId(offerId);

    try {
      await repayLoanAsync(offerId);
    } finally {
      refetchTokens();
      refetchOffers();
      setIsCreatingOffer(false);
      setProcessingOfferId(undefined);
    }
  };

  const handleClaimCollateral = async (offerId: bigint) => {
    setIsCreatingOffer(true);
    setProcessingOfferId(offerId);

    try {
      await claimCollateralAsync(offerId);
    } finally {
      refetchTokens();
      refetchOffers();
      setIsCreatingOffer(false);
      setProcessingOfferId(undefined);
    }
  };

  // Prepare sorted offers for display
  const myActiveOffers = [...(lenderOffers || []), ...(borrowerOffers || [])].filter(
    offer => offer.status === RepoOfferStatus.Active || offer.status === RepoOfferStatus.Open,
  );

  // Filter offers that the current user can view (not created by them)
  const availableOffers = openOffers?.filter(offer => offer.lenderRefundAddress !== myAddress) || [];

  // State for managing the active tab
  const [activeTab, setActiveTab] = useState("offers");

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative w-full px-4">
      <div className="flex flex-col items-center w-full mt-10">
        <h2 className="mb-4 font-medium text-2xl text-center">Intraday Repo</h2>

        <HiddenContent>
          <div className="w-full max-w-[1000px]">
            {/* Create Offer Button and Info */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Lending Offer
                </Button>
              </div>
            </div>

            {/* Tabs for Current Offers and History */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-6">
              <TabsList className="w-full flex justify-start mb-4">
                <TabsTrigger value="offers">Current Offers</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="offers" className="space-y-6">
                {/* My Active Offers Section */}
                {myActiveOffers.length > 0 && (
                  <RepoTable
                    title="My Active Offers"
                    offers={myActiveOffers}
                    myAddress={myAddress}
                    isMyOffers={true}
                    isProcessing={isCreatingOffer}
                    processingOfferId={processingOfferId}
                    gracePeriod={gracePeriod}
                    onAcceptOffer={handleAcceptOffer}
                    onCancelOffer={handleCancelOffer}
                    onRepayLoan={handleRepayLoan}
                    onClaimCollateral={handleClaimCollateral}
                  />
                )}

                {/* Available Offers Table */}
                <RepoTable
                  title="Available Offers"
                  offers={availableOffers}
                  myAddress={myAddress}
                  isProcessing={isCreatingOffer}
                  processingOfferId={processingOfferId}
                  gracePeriod={gracePeriod}
                  onAcceptOffer={handleAcceptOffer}
                  onCancelOffer={handleCancelOffer}
                  onRepayLoan={handleRepayLoan}
                  onClaimCollateral={handleClaimCollateral}
                />
              </TabsContent>

              <TabsContent value="history">
                {/* Historical Offers Table */}
                <RepoHistoryTable title="My Offer History" offers={historicalOffers} myAddress={myAddress} />
              </TabsContent>
            </Tabs>

            {/* Create Offer Modal */}
            <CreateOfferModal
              isOpen={isCreateModalOpen}
              onClose={() => setIsCreateModalOpen(false)}
              offerState={offerState}
              lendTokenBalance={lendTokenBalance}
              collateralTokenBalance={collateralTokenBalance}
              isCreatingOffer={isCreatingOffer}
              onTokenChange={handleTokenChange}
              onAmountChange={handleAmountChange}
              onDurationChange={handleDurationChange}
              onFeeChange={handleFeeChange}
              onSubmit={handleCreateOffer}
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
