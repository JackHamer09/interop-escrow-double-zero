import React, { useState } from "react";
import { TradeItem } from "./TradeItem";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { Address } from "viem";
import { Button } from "~~/components/ui/button";
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
  const [showAllTrades, setShowAllTrades] = useState(false);

  if (!trades || trades.length === 0) {
    return <h3>No trades.</h3>;
  }

  // Sort trades by ID (newest first)
  const sortedTrades = [...trades].sort((a, b) => Number(b.tradeId - a.tradeId));

  // Determine which trades to display
  const displayedTrades = showAllTrades ? sortedTrades : [sortedTrades[0]];

  return (
    <div className="space-y-4">
      {displayedTrades.map((trade, i) => (
        <TradeItem
          key={i}
          trade={trade}
          myAddress={myAddress}
          isAddingTrade={isAddingTrade}
          onAcceptTrade={onAcceptTrade}
          onCancelTrade={onCancelTrade}
        />
      ))}

      {sortedTrades.length > 1 && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-primary flex items-center gap-1"
            onClick={() => setShowAllTrades(!showAllTrades)}
          >
            {showAllTrades ? (
              <>
                <ChevronUpIcon className="h-4 w-4" />
                <span>Show Less</span>
              </>
            ) : (
              <>
                <ChevronDownIcon className="h-4 w-4" />
                <span>Show Previous Trades ({sortedTrades.length - 1} more)</span>
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};
