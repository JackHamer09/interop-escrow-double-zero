import React, { useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { Clock, FileClockIcon } from "lucide-react";
import { Address, formatUnits } from "viem";
import { ShortAddress } from "~~/components/Trade/ShortAddress";
import { Badge } from "~~/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~~/components/ui/select";
import { RepoOfferStatus } from "~~/config/repo-config";
import { repoMainChain, repoSupportedChains, repoSupportedTokens } from "~~/config/repo-config";
import { RepoOffer } from "~~/hooks/use-repo-contract";

interface RepoHistoryTableProps {
  offers: readonly RepoOffer[] | undefined;
  myAddress?: Address;
  title: string;
}

export const RepoHistoryTable: React.FC<RepoHistoryTableProps> = ({ offers, myAddress, title }) => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("all");
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
  const formatTimestamp = (timestamp: bigint) => {
    if (timestamp === 0n) return "N/A";
    const date = new Date(Number(timestamp) * 1000);
    return format(date, "MMM d, yyyy HH:mm");
  };

  const getStatusBadge = (status: RepoOfferStatus) => {
    switch (status) {
      case RepoOfferStatus.Completed:
        return <Badge className="bg-blue-500">Completed</Badge>;
      case RepoOfferStatus.Cancelled:
        return <Badge className="bg-red-500">Cancelled</Badge>;
      case RepoOfferStatus.Defaulted:
        return <Badge className="bg-yellow-500">Defaulted</Badge>;
      default:
        return <Badge className="bg-gray-500">Unknown</Badge>;
    }
  };

  // Filter offers based on status and user role
  const filteredOffers = React.useMemo(() => {
    if (!offers) return [];

    return offers.filter(offer => {
      // Filter by status
      if (statusFilter !== "all") {
        const statusValue = parseInt(statusFilter);
        if (offer.status !== statusValue) {
          return false;
        }
      }

      // Filter by user role
      if (userRoleFilter === "lender" && offer.lender !== myAddress) {
        return false;
      }
      if (userRoleFilter === "borrower" && offer.borrower !== myAddress) {
        return false;
      }

      return true;
    });
  }, [offers, statusFilter, userRoleFilter, myAddress]);

  if (!offers || offers.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-medium mb-4 flex items-center gap-2">
          <FileClockIcon className="h-5 w-5" />
          {title}
        </h2>
        <div className="border rounded-lg p-8 text-center text-gray-400">No historical offers found</div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-medium flex items-center gap-2">
          <FileClockIcon className="h-5 w-5" />
          {title}
        </h2>

        {/* Filter Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Status:</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value={RepoOfferStatus.Completed.toString()}>Completed</SelectItem>
                <SelectItem value={RepoOfferStatus.Cancelled.toString()}>Cancelled</SelectItem>
                <SelectItem value={RepoOfferStatus.Defaulted.toString()}>Defaulted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Role:</span>
            <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="lender">As Lender</SelectItem>
                <SelectItem value="borrower">As Borrower</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {filteredOffers.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-gray-400">No offers match your filters</div>
      ) : (
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
                  Completed
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Counterparty
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredOffers.map(offer => {
                const lendToken = repoSupportedTokens.find(e => e.addresses[repoMainChain.id] === offer.lendToken);
                const collateralToken = repoSupportedTokens.find(
                  e => e.addresses[repoMainChain.id] === offer.collateralToken,
                );
                const lendChain = repoSupportedChains.find(chain => BigInt(chain.id) === offer.lenderChainId);
                const collateralChain =
                  offer.borrowerChainId !== 0n
                    ? repoSupportedChains.find(chain => BigInt(chain.id) === offer.borrowerChainId)
                    : undefined;

                // Determine which address to show as counterparty
                const counterparty = myAddress === offer.lender ? offer.borrower : offer.lender;
                const endTimeFormatted = formatTimestamp(offer.endTime);

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
                      <div className="text-sm">{endTimeFormatted}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {counterparty === "0x" ? (
                          <span className="text-gray-400">N/A</span>
                        ) : counterparty === myAddress ? (
                          <span className="text-blue-400">You</span>
                        ) : (
                          <ShortAddress address={counterparty} isRight={false} />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">{getStatusBadge(offer.status)}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {offer.lender === myAddress ? (
                        <Badge variant="secondary">Lender</Badge>
                      ) : (
                        <Badge variant="secondary">Borrower</Badge>
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
