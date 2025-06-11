import React, { useEffect, useState } from "react";
import Image from "next/image";
import { AlertTriangle, Clock } from "lucide-react";
import { Address, formatUnits, zeroAddress } from "viem";
import { ShortAddress } from "~~/components/Trade/ShortAddress";
import { Button } from "~~/components/ui/button";
import { RepoOfferStatus } from "~~/config/repo-config";
import { repoMainChain, repoSupportedChains, repoSupportedTokens } from "~~/config/repo-config";
import { RepoOffer } from "~~/hooks/use-repo-contract";

interface RepoTableProps {
  offers: readonly RepoOffer[] | undefined;
  myAddress?: Address;
  title: string;
  isMyOffers?: boolean;
  isProcessing: boolean;
  processingOfferId?: bigint;
  gracePeriod?: bigint;
  onAcceptOffer: (offer: RepoOffer) => void;
  onCancelOffer: (offerId: bigint) => void;
  onRepayLoan: (offerId: bigint) => void;
  onClaimCollateral: (offerId: bigint) => void;
}

export const RepoTable: React.FC<RepoTableProps> = ({
  offers,
  myAddress,
  title,
  isMyOffers = false,
  isProcessing,
  processingOfferId,
  gracePeriod = 120n, // Default 2 minutes (from contract)
  onAcceptOffer,
  onCancelOffer,
  onRepayLoan,
  onClaimCollateral,
}) => {
  // State to track the current time for updating countdowns
  const [currentTime, setCurrentTime] = useState<number>(Math.floor(Date.now() / 1000));

  // Update current time every second to refresh countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, []);
  // Format duration from seconds to a readable format
  const formatOfferDuration = (seconds: bigint) => {
    const hours = Number(seconds) / 3600;
    if (hours < 1) {
      return `${Math.round(hours * 60)} min`;
    } else if (hours === 1) {
      return "1 hour";
    } else {
      return `${Math.round(hours)} hrs`;
    }
  };

  // Format timestamp to date and time
  const formatTimeLeft = (startTime: bigint, endTime: bigint) => {
    if (startTime === 0n || endTime === 0n) return "N/A";

    const end = Number(endTime);
    const graceEnd = Number(endTime) + Number(gracePeriod);

    if (currentTime > graceEnd) {
      return "Past due";
    }

    if (currentTime > end) {
      const graceSecondsLeft = graceEnd - currentTime;
      return `Grace: ${
        graceSecondsLeft < 60
          ? `${graceSecondsLeft}s`
          : `${Math.floor(graceSecondsLeft / 60)}m${graceSecondsLeft % 60 > 0 ? ` ${graceSecondsLeft % 60}s` : ""}`
      }`;
    }

    const secondsLeft = end - currentTime;
    if (secondsLeft < 60) {
      return `${secondsLeft}s left`;
    } else if (secondsLeft < 3600) {
      return `${Math.floor(secondsLeft / 60)}m ${secondsLeft % 60 > 0 ? `${secondsLeft % 60}s` : ""} left`;
    } else if (secondsLeft < 86400) {
      return `${Math.floor(secondsLeft / 3600)}h ${Math.floor((secondsLeft % 3600) / 60)}m left`;
    } else {
      return `${Math.floor(secondsLeft / 86400)}d ${Math.floor((secondsLeft % 86400) / 3600)}h left`;
    }
  };

  const getStatusText = (offer: RepoOffer) => {
    switch (offer.status) {
      case RepoOfferStatus.Open:
        return "Open";
      case RepoOfferStatus.Active:
        return formatTimeLeft(offer.startTime, offer.endTime);
      case RepoOfferStatus.Completed:
        return "Completed";
      case RepoOfferStatus.Cancelled:
        return "Cancelled";
      case RepoOfferStatus.Defaulted:
        return "Defaulted";
      default:
        return "Unknown";
    }
  };

  const getStatusColor = (offer: RepoOffer) => {
    const isInGracePeriod =
      offer.status === RepoOfferStatus.Active &&
      offer.endTime > 0n &&
      BigInt(currentTime) > offer.endTime &&
      BigInt(currentTime) <= offer.endTime + gracePeriod;

    const isPastDue =
      offer.status === RepoOfferStatus.Active &&
      offer.endTime > 0n &&
      BigInt(currentTime) > offer.endTime + gracePeriod;

    switch (offer.status) {
      case RepoOfferStatus.Open:
        return "text-blue-400";
      case RepoOfferStatus.Active:
        if (isPastDue) return "text-red-400";
        if (isInGracePeriod) return "text-red-400";
        return "text-green-400";
      case RepoOfferStatus.Completed:
        return "text-blue-400";
      case RepoOfferStatus.Cancelled:
        return "text-red-400";
      case RepoOfferStatus.Defaulted:
        return "text-yellow-400";
      default:
        return "text-gray-400";
    }
  };

  const renderActionButton = (offer: RepoOffer) => {
    const isInGracePeriod =
      offer.status === RepoOfferStatus.Active &&
      offer.endTime > 0n &&
      BigInt(currentTime) > offer.endTime &&
      BigInt(currentTime) <= offer.endTime + gracePeriod;

    const isPastDue =
      offer.status === RepoOfferStatus.Active &&
      offer.endTime > 0n &&
      BigInt(currentTime) > offer.endTime + gracePeriod;

    if (offer.status === RepoOfferStatus.Open) {
      if (isMyOffers && offer.lender === myAddress) {
        return (
          <Button
            variant="destructive"
            size="sm"
            loading={isProcessing && processingOfferId === offer.offerId}
            onClick={() => onCancelOffer(offer.offerId)}
          >
            Cancel
          </Button>
        );
      } else {
        return (
          <Button
            size="sm"
            loading={isProcessing && processingOfferId === offer.offerId}
            onClick={() => onAcceptOffer(offer)}
          >
            Borrow
          </Button>
        );
      }
    } else if (offer.status === RepoOfferStatus.Active) {
      if (offer.borrower === myAddress) {
        return (
          <Button
            size="sm"
            loading={isProcessing && processingOfferId === offer.offerId}
            onClick={() => onRepayLoan(offer.offerId)}
          >
            Repay
          </Button>
        );
      } else if (offer.lender === myAddress) {
        if (isPastDue) {
          return (
            <Button
              variant="destructive"
              size="sm"
              loading={isProcessing && processingOfferId === offer.offerId}
              onClick={() => onClaimCollateral(offer.offerId)}
            >
              Claim
            </Button>
          );
        } else if (isInGracePeriod) {
          return (
            <Button variant="outline" size="sm" disabled={true} className="flex items-center">
              <AlertTriangle className="h-3 w-3 mr-1" />
              In Grace Period
            </Button>
          );
        }
      }
    }

    return null;
  };

  if (!offers || offers.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-medium mb-4">{title}</h2>
        <div className="border rounded-lg p-8 text-center text-gray-400">No offers available</div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-xl font-medium mb-4">{title}</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Lending
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Collateral
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                {isMyOffers ? "Counterparty" : "Lender"}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {offers.map(offer => {
              const lendToken = repoSupportedTokens.find(e => e.addresses[repoMainChain.id] === offer.lendToken);
              const collateralToken = repoSupportedTokens.find(
                e => e.addresses[repoMainChain.id] === offer.collateralToken,
              );
              const statusColor = getStatusColor(offer);
              const lendChain = repoSupportedChains.find(chain => BigInt(chain.id) === offer.lenderChainId);
              const collateralChain =
                offer.borrowerChainId !== 0n
                  ? repoSupportedChains.find(chain => BigInt(chain.id) === offer.borrowerChainId)
                  : undefined;

              // Determine which address to show as counterparty
              const counterparty = isMyOffers
                ? myAddress === offer.lender
                  ? offer.borrower
                  : offer.lender
                : offer.lender;

              return (
                <tr key={offer.offerId.toString()} className="hover:bg-gray-800/30">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium">#{offer.offerId.toString()}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {lendToken && (
                        <>
                          <Image
                            src={lendToken.logo}
                            alt={lendToken.symbol}
                            width={20}
                            height={20}
                            className="rounded-full mr-2"
                          />
                          <div className="text-sm">
                            {formatUnits(offer.lendAmount, lendToken.decimals)} {lendToken.symbol}
                          </div>
                          {lendChain && <div className="text-xs text-gray-400 ml-2">on {lendChain.name}</div>}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {collateralToken && (
                        <>
                          <Image
                            src={collateralToken.logo}
                            alt={collateralToken.symbol}
                            width={20}
                            height={20}
                            className="rounded-full mr-2"
                          />
                          <div className="text-sm">
                            {formatUnits(offer.collateralAmount, collateralToken.decimals)} {collateralToken.symbol}
                          </div>
                          {collateralChain && (
                            <div className="text-xs text-gray-400 ml-2">on {collateralChain.name}</div>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm flex items-center">
                      <Clock className="h-4 w-4 mr-1 inline" />
                      {formatOfferDuration(offer.duration)}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      {counterparty !== zeroAddress &&
                        (counterparty === myAddress ? (
                          <span className="text-blue-400">You</span>
                        ) : (
                          <ShortAddress address={counterparty} isRight={false} />
                        ))}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${statusColor}`}>{getStatusText(offer)}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right">{renderActionButton(offer)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
