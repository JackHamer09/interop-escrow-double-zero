import React from "react";
import { CheckIcon, DollarSignIcon, XIcon } from "lucide-react";
import { Address } from "viem";
import { EscrowTradeStatus } from "~~/hooks/use-trade-escrow";
import { cn } from "~~/utils/cn";

interface TradeProgressProps {
  status: EscrowTradeStatus;
  partyA: Address;
  partyB: Address;
  depositedB: boolean;
  myAddress?: Address;
}

export const TradeProgress: React.FC<TradeProgressProps> = ({ status, partyA, partyB, depositedB, myAddress }) => {
  return (
    <div className="relative px-6 flex justify-center w-full mt-3 mb-12">
      <ol className="flex items-center w-4/5">
        <li
          className={cn(
            "flex w-full items-center after:content-[''] after:w-full after:h-1 after:border-b after:border-4 after:inline-block after:border-blue-800 relative",
            status === EscrowTradeStatus.Declined && "after:border-red-700/50",
          )}
        >
          <span
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full bg-blue-800 shrink-0",
              status === EscrowTradeStatus.Declined && "after:border-red-700 bg-red-800/50",
            )}
          >
            {[EscrowTradeStatus.PendingCounterpartyDeposit, EscrowTradeStatus.Complete].includes(status) && (
              <CheckIcon className="w-5 h-5 text-gray-100" />
            )}
            {status === EscrowTradeStatus.Declined && <XIcon className="w-5 h-5 text-red-500" />}
          </span>
          {status === EscrowTradeStatus.Declined ? (
            <span className="absolute top-10 -left-5 px-2 py-0.5 text-red-400 border-red-500 border bg-red-700 bg-opacity-30 rounded whitespace-nowrap">
              Declined
            </span>
          ) : (
            <span className="absolute top-10 -left-10 italic whitespace-nowrap">Propose & Deposit</span>
          )}
        </li>
        <li className="flex items-center w-8 relative">
          <span
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full shrink-0",
              status === EscrowTradeStatus.Complete && "bg-blue-800",
              status === EscrowTradeStatus.Declined && "bg-red-800/50",
              status === EscrowTradeStatus.PendingCounterpartyDeposit && "bg-gray-700",
            )}
          >
            {status === EscrowTradeStatus.PendingCounterpartyDeposit &&
              (partyB === myAddress && !depositedB ? (
                <DollarSignIcon className="w-5 h-5 text-yellow-400" />
              ) : (
                <DollarSignIcon className="w-5 h-5 text-gray-400" />
              ))}
            {[EscrowTradeStatus.Complete].includes(status) && <CheckIcon className="w-5 h-5 text-gray-100" />}
            {status === EscrowTradeStatus.Declined && <XIcon className="w-5 h-5 text-red-500" />}
          </span>
          {status === EscrowTradeStatus.PendingCounterpartyDeposit && partyB === myAddress && !depositedB ? (
            <span className="absolute top-10 left-1/2 transform -translate-x-1/2 px-2 py-0.5 text-yellow-400 border-yellow-500 border bg-yellow-700 bg-opacity-30 rounded text-center whitespace-nowrap">
              Your Turn to Deposit
            </span>
          ) : status === EscrowTradeStatus.PendingCounterpartyDeposit &&
            (partyA === myAddress || (partyB === myAddress && depositedB)) ? (
            <span className="absolute top-10 left-1/2 transform -translate-x-1/2 px-2 py-0.5 text-blue-400 border-blue-500 border bg-blue-700 bg-opacity-30 rounded text-center whitespace-nowrap">
              Waiting for Counterparty
            </span>
          ) : status === EscrowTradeStatus.Complete ? (
            <span className="absolute top-10 left-1/2 transform -translate-x-1/2 px-2 py-0.5 border-gray-500 border bg-gray-700 bg-opacity-30 rounded whitespace-nowrap">
              Completed
            </span>
          ) : status === EscrowTradeStatus.Declined ? (
            <span className="absolute top-10 left-1/2 transform -translate-x-1/2 px-2 py-0.5 text-red-400 border-red-500 border bg-red-700 bg-opacity-30 rounded whitespace-nowrap">
              Declined
            </span>
          ) : (
            <span className="absolute top-10 left-1/2 transform -translate-x-1/2 italic whitespace-nowrap">
              Counterparty Deposit
            </span>
          )}
        </li>
      </ol>
    </div>
  );
};
