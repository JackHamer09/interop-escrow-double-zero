import React from "react";
import { TradeItem } from "./TradeItem";
import { Address } from "viem";
import { EscrowTrade } from "~~/hooks/use-trade-escrow";

interface TradeListProps {
  trades: readonly EscrowTrade[] | undefined;
  myAddress?: Address;
  isAddingTrade: boolean;
  onAcceptTrade: (trade: EscrowTrade) => void;
  onCancelTrade: (tradeId: bigint) => void;
}

export const TradeList: React.FC<TradeListProps> = ({
  trades,
  myAddress,
  isAddingTrade,
  onAcceptTrade,
  onCancelTrade,
}) => {
  if (!trades || trades.length === 0) {
    return <h3>No trades.</h3>;
  }

  return (
    <>
      {[...trades]
        .sort((a, b) => {
          return Number(b.tradeId - a.tradeId);
        })
        .map((trade, i) => (
          <TradeItem
            key={i}
            trade={trade}
            myAddress={myAddress}
            isAddingTrade={isAddingTrade}
            onAcceptTrade={onAcceptTrade}
            onCancelTrade={onCancelTrade}
          />
        ))}
    </>
  );
};
