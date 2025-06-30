import React from "react";
import { RepoOfferForm } from "./RepoOfferForm";
import { X } from "lucide-react";
import { Hash } from "viem";
import { Button } from "~~/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "~~/components/ui/dialog";
import { TokenConfig } from "~~/config/tokens-config";

interface CreateOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  offerState: {
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
  };
  lendTokenBalance: bigint;
  collateralTokenBalance: bigint;
  isCreatingOffer: boolean;
  onTokenChange: (tokenAssetId: Hash, tokenType: "lendToken" | "collateralToken") => void;
  onAmountChange: (e: React.ChangeEvent<HTMLInputElement>, tokenType: "lendToken" | "collateralToken") => void;
  onChainChange: (value: number, chainType: "chainA" | "chainB") => void;
  onDurationChange: (value: number) => void;
  onFeeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
}

export const CreateOfferModal: React.FC<CreateOfferModalProps> = ({
  isOpen,
  onClose,
  offerState,
  lendTokenBalance,
  collateralTokenBalance,
  isCreatingOffer,
  onTokenChange,
  onAmountChange,
  onChainChange,
  onDurationChange,
  onFeeChange,
  onSubmit,
}) => {
  const handleSubmit = async () => {
    await onSubmit();
    if (!isCreatingOffer) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Create Lending Offer</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>
        <div className="mt-4">
          <RepoOfferForm
            offerState={offerState}
            lendTokenBalance={lendTokenBalance}
            collateralTokenBalance={collateralTokenBalance}
            isCreatingOffer={isCreatingOffer}
            onTokenChange={onTokenChange}
            onAmountChange={onAmountChange}
            onChainChange={onChainChange}
            onDurationChange={onDurationChange}
            onFeeChange={onFeeChange}
            onSubmit={handleSubmit}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
