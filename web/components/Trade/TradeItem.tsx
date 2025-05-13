import React from "react";
import { TokenDisplay } from "./TokenDisplay";
import { TradeProgress } from "./TradeProgress";
import { ArrowLeftRightIcon } from "lucide-react";
import { Address } from "viem";
import { Button } from "~~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~~/components/ui/card";
import { TTBILL_TOKEN, USDC_TOKEN } from "~~/contracts/tokens";
import { EscrowTrade, EscrowTradeStatus } from "~~/hooks/use-trade-escrow";

interface TradeItemProps {
  trade: EscrowTrade;
  myAddress?: Address;
  isAddingTrade: boolean;
  onAcceptTrade: (trade: EscrowTrade) => void;
  onCancelTrade: (tradeId: bigint) => void;
}

export const TradeItem: React.FC<TradeItemProps> = ({
  trade,
  myAddress,
  isAddingTrade,
  onAcceptTrade,
  onCancelTrade,
}) => {
  return (
    <Card className="mb-4 hover:bg-slate-400 hover:bg-opacity-5 border-slate-600">
      <CardHeader className="p-4 pb-3">
        <CardTitle className="text-muted-foreground text-sm font-normal">
          <div className="flex flex-col">
            <div className="text-lg">Trade ID-{trade.tradeId.toString()}</div>

            <TradeProgress
              status={trade.status}
              partyA={trade.partyA}
              partyB={trade.partyB}
              depositedB={trade.depositedB}
              myAddress={myAddress}
            />
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-y-2 p-4 pt-0">
        <div className="flex items-center justify-center mb-2">
          <div className="flex items-center gap-4 min-w-32 justify-end">
            <TokenDisplay
              token={USDC_TOKEN}
              amount={trade.amountA}
              party={trade.partyA}
              myAddress={myAddress}
              isRight={false}
            />
          </div>

          <ArrowLeftRightIcon className="h-7 w-7 my-4 mx-8 text-muted-foreground" />

          <div className="flex items-center gap-4 min-w-32">
            <TokenDisplay
              token={TTBILL_TOKEN}
              amount={trade.amountB}
              party={trade.partyB}
              myAddress={myAddress}
              isRight={true}
            />
          </div>
        </div>

        <div className="flex gap-4 items-center justify-center">
          {trade.status === EscrowTradeStatus.PendingCounterpartyDeposit &&
            trade.partyB === myAddress &&
            !trade.depositedB && (
              <Button className="p-4" loading={isAddingTrade} onClick={() => onAcceptTrade(trade)}>
                Deposit My Funds
              </Button>
            )}
          {trade.status === EscrowTradeStatus.PendingCounterpartyDeposit && (
            <Button
              className="p-4"
              variant="destructive"
              loading={isAddingTrade}
              onClick={() => onCancelTrade(trade.tradeId)}
            >
              Cancel Trade
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
