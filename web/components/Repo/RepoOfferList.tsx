import React, { useState } from "react";
import { RepoOfferItem } from "./RepoOfferItem";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { Address } from "viem";
import { Button } from "~~/components/ui/button";
import { RepoOffer } from "~~/hooks/use-repo-contract";

interface RepoOfferListProps {
  title: string;
  offers: readonly RepoOffer[] | undefined;
  myAddress?: Address;
  isProcessing: boolean;
  onAcceptOffer: (offer: RepoOffer) => void;
  onCancelOffer: (offerId: bigint) => void;
  onRepayLoan: (offerId: bigint) => void;
  onClaimCollateral: (offerId: bigint) => void;
}

export const RepoOfferList: React.FC<RepoOfferListProps> = ({
  title,
  offers,
  myAddress,
  isProcessing,
  onAcceptOffer,
  onCancelOffer,
  onRepayLoan,
  onClaimCollateral,
}) => {
  const [showAllOffers, setShowAllOffers] = useState(false);

  if (!offers || offers.length === 0) {
    return (
      <div>
        <h3 className="font-medium text-xl mb-4">{title}</h3>
        <p className="text-muted-foreground">No offers found.</p>
      </div>
    );
  }

  // Sort offers by ID (newest first)
  const sortedOffers = [...offers].sort((a, b) => Number(b.offerId - a.offerId));

  // Determine which offers to display
  const displayedOffers = showAllOffers ? sortedOffers : sortedOffers.slice(0, 3);

  return (
    <div className="mb-10">
      <h3 className="font-medium text-xl mb-4">{title}</h3>
      <div className="space-y-4">
        {displayedOffers.map((offer, i) => (
          <RepoOfferItem
            key={i}
            offer={offer}
            myAddress={myAddress}
            isProcessing={isProcessing}
            onAcceptOffer={onAcceptOffer}
            onCancelOffer={onCancelOffer}
            onRepayLoan={onRepayLoan}
            onClaimCollateral={onClaimCollateral}
          />
        ))}

        {sortedOffers.length > 3 && (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary flex items-center gap-1"
              onClick={() => setShowAllOffers(!showAllOffers)}
            >
              {showAllOffers ? (
                <>
                  <ChevronUpIcon className="h-4 w-4" />
                  <span>Show Less</span>
                </>
              ) : (
                <>
                  <ChevronDownIcon className="h-4 w-4" />
                  <span>Show More ({sortedOffers.length - 3} more)</span>
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};