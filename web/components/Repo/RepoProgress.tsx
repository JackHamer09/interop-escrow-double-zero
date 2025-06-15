import React from "react";
import { CheckIcon, ClockIcon, Coins, XIcon } from "lucide-react";
import { Address } from "viem";
import { RepoOfferStatus } from "~~/config/repo-config";
import { cn } from "~~/utils/cn";

interface RepoProgressProps {
  status: RepoOfferStatus;
  lender: Address;
  borrower: Address;
  startTime: bigint;
  endTime: bigint;
  isPastDue: boolean;
  myAddress?: Address;
}

export const RepoProgress: React.FC<RepoProgressProps> = ({ 
  status, 
  lender, 
  borrower, 
  isPastDue,
  startTime,
  endTime,
  myAddress 
}) => {
  // Format timestamp to date and time
  const formatTimeLeft = () => {
    if (startTime === 0n || endTime === 0n) return null;
    
    const now = Math.floor(Date.now() / 1000);
    const end = Number(endTime);
    
    if (now > end) {
      return "Past due";
    }
    
    const secondsLeft = end - now;
    if (secondsLeft < 60) {
      return `${secondsLeft}s left`;
    } else if (secondsLeft < 3600) {
      return `${Math.floor(secondsLeft / 60)}m left`;
    } else if (secondsLeft < 86400) {
      return `${Math.floor(secondsLeft / 3600)}h ${Math.floor((secondsLeft % 3600) / 60)}m left`;
    } else {
      return `${Math.floor(secondsLeft / 86400)}d ${Math.floor((secondsLeft % 86400) / 3600)}h left`;
    }
  };

  const timeLeft = formatTimeLeft();

  return (
    <div className="relative px-6 flex justify-center w-full mt-3 mb-12">
      <ol className="flex items-center w-full max-w-4xl">
        <li
          className={cn(
            "flex w-full items-center after:content-[''] after:w-full after:h-1 after:border-b after:border-4 after:inline-block relative",
            (status === RepoOfferStatus.Open || status === RepoOfferStatus.Active || status === RepoOfferStatus.Completed) && "after:border-blue-800",
            status === RepoOfferStatus.Cancelled && "after:border-red-700/50",
            status === RepoOfferStatus.Defaulted && "after:border-yellow-700/50",
          )}
        >
          <span
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full shrink-0",
              (status === RepoOfferStatus.Open || status === RepoOfferStatus.Active || status === RepoOfferStatus.Completed) && "bg-blue-800",
              status === RepoOfferStatus.Cancelled && "bg-red-800/50",
              status === RepoOfferStatus.Defaulted && "bg-yellow-700",
            )}
          >
            {[RepoOfferStatus.Open, RepoOfferStatus.Active, RepoOfferStatus.Completed].includes(status) && (
              <CheckIcon className="w-5 h-5 text-gray-100" />
            )}
            {status === RepoOfferStatus.Cancelled && <XIcon className="w-5 h-5 text-red-500" />}
            {status === RepoOfferStatus.Defaulted && <ClockIcon className="w-5 h-5 text-yellow-200" />}
          </span>
          {status === RepoOfferStatus.Cancelled ? (
            <span className="absolute top-10 -left-5 px-2 py-0.5 text-red-400 border-red-500 border bg-red-700 bg-opacity-30 rounded whitespace-nowrap">
              Cancelled
            </span>
          ) : (
            <span className="absolute top-10 -left-10 italic whitespace-nowrap">Offer Created</span>
          )}
        </li>
        
        <li
          className={cn(
            "flex w-full items-center after:content-[''] after:w-full after:h-1 after:border-b after:border-4 after:inline-block relative",
            (status === RepoOfferStatus.Active || status === RepoOfferStatus.Completed) && "after:border-blue-800",
            status === RepoOfferStatus.Cancelled && "after:border-red-700/50",
            status === RepoOfferStatus.Defaulted && "after:border-yellow-700/50",
            status === RepoOfferStatus.Open && "after:border-gray-700",
          )}
        >
          <span
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full shrink-0",
              (status === RepoOfferStatus.Active || status === RepoOfferStatus.Completed) && "bg-blue-800",
              status === RepoOfferStatus.Cancelled && "bg-red-800/50",
              status === RepoOfferStatus.Defaulted && "bg-yellow-700",
              status === RepoOfferStatus.Open && "bg-gray-700",
            )}
          >
            {[RepoOfferStatus.Active, RepoOfferStatus.Completed].includes(status) && (
              <CheckIcon className="w-5 h-5 text-gray-100" />
            )}
            {status === RepoOfferStatus.Cancelled && <XIcon className="w-5 h-5 text-red-500" />}
            {status === RepoOfferStatus.Defaulted && <ClockIcon className="w-5 h-5 text-yellow-200" />}
            {status === RepoOfferStatus.Open && <Coins className="w-5 h-5 text-gray-400" />}
          </span>
          <span className="absolute top-10 -translate-x-1/2 left-1/2 whitespace-nowrap italic">
            Offer Accepted
          </span>
        </li>

        <li className="flex items-center relative">
          <span
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full shrink-0",
              status === RepoOfferStatus.Completed && "bg-blue-800",
              status === RepoOfferStatus.Cancelled && "bg-red-800/50",
              status === RepoOfferStatus.Defaulted && "bg-yellow-700",
              (status === RepoOfferStatus.Open || status === RepoOfferStatus.Active) && "bg-gray-700",
            )}
          >
            {status === RepoOfferStatus.Completed && <CheckIcon className="w-5 h-5 text-gray-100" />}
            {status === RepoOfferStatus.Cancelled && <XIcon className="w-5 h-5 text-red-500" />}
            {status === RepoOfferStatus.Defaulted && <ClockIcon className="w-5 h-5 text-yellow-200" />}
            {[RepoOfferStatus.Open, RepoOfferStatus.Active].includes(status) && (
              <ClockIcon className="w-5 h-5 text-gray-400" />
            )}
          </span>
          {status === RepoOfferStatus.Completed ? (
            <span className="absolute top-10 px-2 py-0.5 border-gray-500 border bg-gray-700 bg-opacity-30 rounded whitespace-nowrap -translate-x-1/2 left-1/2">
              Loan Repaid
            </span>
          ) : status === RepoOfferStatus.Defaulted ? (
            <span className="absolute top-10 px-2 py-0.5 text-yellow-400 border-yellow-500 border bg-yellow-700 bg-opacity-30 rounded whitespace-nowrap -translate-x-1/2 left-1/2">
              Defaulted
            </span>
          ) : status === RepoOfferStatus.Cancelled ? (
            <span className="absolute top-10 px-2 py-0.5 text-red-400 border-red-500 border bg-red-700 bg-opacity-30 rounded whitespace-nowrap -translate-x-1/2 left-1/2">
              Cancelled
            </span>
          ) : status === RepoOfferStatus.Active ? (
            <span className={cn(
              "absolute top-10 px-2 py-0.5 border rounded whitespace-nowrap -translate-x-1/2 left-1/2",
              isPastDue ? "text-red-400 border-red-500 bg-red-700 bg-opacity-30" : "text-blue-400 border-blue-500 bg-blue-700 bg-opacity-30"
            )}>
              {isPastDue ? "Past Due" : timeLeft || "Active"}
            </span>
          ) : (
            <span className="absolute top-10 italic whitespace-nowrap -translate-x-1/2 left-1/2">
              Waiting for Repayment
            </span>
          )}
        </li>
      </ol>
    </div>
  );
};