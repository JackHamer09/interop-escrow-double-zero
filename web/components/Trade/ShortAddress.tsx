import React, { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { cn } from "~~/utils/cn";

interface ShortAddressProps {
  address: string;
  isRight: boolean;
}

export const ShortAddress: React.FC<ShortAddressProps> = ({ address, isRight }) => {
  const [copied, setCopied] = useState(false);
  const shortAddress = address.slice(0, 5) + "..." + address.slice(address.length - 4, address.length);

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 800);
  };

  return (
    <div
      className={cn(
        "flex items-center text-sm text-muted-foreground hover:text-white hover:cursor-pointer",
        isRight && "justify-end",
        "group",
      )}
      onClick={handleCopy}
    >
      <span className={cn("transition-all duration-200", copied && "text-primary")}>{shortAddress}</span>

      <span className={cn("ml-2 transition-all duration-200", copied && "text-primary scale-110 transform")}>
        {copied ? (
          <CheckIcon className="h-4 w-4" />
        ) : (
          <CopyIcon className="h-4 w-4 group-hover:scale-110 transition-transform" />
        )}
      </span>
    </div>
  );
};
