import React from "react";
import { RepoTokenDisplay } from "./RepoTokenDisplay";
import { RepoProgress } from "./RepoProgress";
import { ArrowLeftRightIcon } from "lucide-react";
import { Address, formatDuration } from "viem";
import { Button } from "~~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~~/components/ui/card";
import { repoMainChain, repoSupportedChains, repoSupportedTokens, RepoOfferStatus } from "~~/config/repo-config";
import { RepoOffer } from "~~/hooks/use-repo-contract";

interface RepoOfferItemProps {
  offer: RepoOffer;
  myAddress?: Address;
  isProcessing: boolean;
  onAcceptOffer: (offer: RepoOffer) => void;
  onCancelOffer: (offerId: bigint) => void;
  onRepayLoan: (offerId: bigint) => void;
  onClaimCollateral: (offerId: bigint) => void;
}

export const RepoOfferItem: React.FC<RepoOfferItemProps> = ({
  offer,
  myAddress,
  isProcessing,
  onAcceptOffer,
  onCancelOffer,
  onRepayLoan,
  onClaimCollateral,
}) => {
  const chainA = repoMainChain; 
  const chainB = repoSupportedChains.find(chain => BigInt(chain.id) === offer.borrowerChainId);
  const lendToken = repoSupportedTokens.find(e => e.addresses[repoMainChain.id] === offer.lendToken);
  const collateralToken = repoSupportedTokens.find(e => e.addresses[repoMainChain.id] === offer.collateralToken);

  // Check if loan is past due date but still active
  const isPastDue = offer.status === RepoOfferStatus.Active && 
    offer.endTime > 0n && 
    BigInt(Math.floor(Date.now() / 1000)) > offer.endTime;

  // Format duration from seconds to a readable format
  const formatOfferDuration = (seconds: bigint) => {
    const hours = Number(seconds) / 3600;
    if (hours < 1) {
      return `${Math.round(hours * 60)} minutes`;
    } else if (hours === 1) {
      return "1 hour";
    } else {
      return `${Math.round(hours)} hours`;
    }
  };

  return (
    <Card className="mb-4 hover:bg-slate-400 hover:bg-opacity-5 border-slate-600">
      <CardHeader className="p-4 pb-3">
        <CardTitle className="text-muted-foreground text-sm font-normal">
          <div className="flex flex-col">
            <div className="flex justify-between">
              <div className="text-lg">Repo Offer #{offer.offerId.toString()}</div>
              <div className="text-sm text-gray-400">
                Duration: {formatOfferDuration(offer.duration)}
              </div>
            </div>

            <RepoProgress
              status={offer.status}
              lender={offer.lender}
              borrower={offer.borrower}
              isPastDue={isPastDue}
              myAddress={myAddress}
              startTime={offer.startTime}
              endTime={offer.endTime}
            />
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-y-2 p-4 pt-0">
        <div className="flex items-center justify-center mb-2">
          <div className="flex items-center gap-4 min-w-32 justify-end">
            {lendToken && (
              <RepoTokenDisplay
                token={lendToken}
                amount={offer.lendAmount}
                party={offer.lender}
                myAddress={myAddress}
                isRight={false}
                chainName={chainA.name}
                label="Lending"
              />
            )}
          </div>

          <ArrowLeftRightIcon className="h-7 w-7 my-4 mx-8 text-muted-foreground" />

          <div className="flex items-center gap-4 min-w-32">
            {collateralToken && (
              <RepoTokenDisplay
                token={collateralToken}
                amount={offer.collateralAmount}
                party={offer.borrower === "0x" ? null : offer.borrower}
                myAddress={myAddress}
                isRight={true}
                chainName={chainB?.name}
                label="Collateral"
              />
            )}
          </div>
        </div>

        <div className="flex gap-4 items-center justify-center">
          {/* Open offer actions */}
          {offer.status === RepoOfferStatus.Open && (
            <>
              {offer.lender === myAddress && (
                <Button
                  className="p-4"
                  variant="destructive"
                  loading={isProcessing}
                  onClick={() => onCancelOffer(offer.offerId)}
                >
                  Cancel Offer
                </Button>
              )}
              {offer.lender !== myAddress && (
                <Button className="p-4" loading={isProcessing} onClick={() => onAcceptOffer(offer)}>
                  Accept & Deposit Collateral
                </Button>
              )}
            </>
          )}

          {/* Active loan actions */}
          {offer.status === RepoOfferStatus.Active && (
            <>
              {offer.borrower === myAddress && (
                <Button className="p-4" loading={isProcessing} onClick={() => onRepayLoan(offer.offerId)}>
                  Repay Loan
                </Button>
              )}
              {offer.lender === myAddress && isPastDue && (
                <Button 
                  className="p-4" 
                  variant="destructive" 
                  loading={isProcessing} 
                  onClick={() => onClaimCollateral(offer.offerId)}
                >
                  Claim Collateral
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};