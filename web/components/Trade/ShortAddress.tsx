import React from "react";
import { CopyIcon } from "lucide-react";
import { cn } from "~~/utils/cn";

interface ShortAddressProps {
  address: string;
  isRight: boolean;
}

export const ShortAddress: React.FC<ShortAddressProps> = ({ address, isRight }) => {
  const shortAddress = address.slice(0, 5) + "..." + address.slice(address.length - 6, address.length);

  return (
    <div
      className={cn(
        "flex items-center text-sm text-muted-foreground hover:text-white hover:cursor-pointer",
        isRight && "justify-end",
      )}
      onClick={() => navigator.clipboard.writeText(address)}
    >
      {shortAddress}
      <CopyIcon className="h-4 w-4 ml-2" />
    </div>
  );
};
