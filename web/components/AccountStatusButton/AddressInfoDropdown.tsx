"use client";

import { useState } from "react";
import { BlockieAvatar } from "../BlockieAvatar";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { ChevronDownIcon } from "lucide-react";
import CopyToClipboard from "react-copy-to-clipboard";
import { Address } from "viem";
import { useAccount, useDisconnect } from "wagmi";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { getChainById } from "~~/config/chains-config";

interface AddressInfoDropdownProps {
  address: Address;
}

const CopyAddressButton = ({ address }: { address: Address }) => {
  const [copied, setCopied] = useState(false);

  return (
    <CopyToClipboard
      text={address}
      onCopy={() => {
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
        }, 800);
      }}
    >
      <div className="flex items-center cursor-pointer w-full">{copied ? "Copied!" : "Copy address"}</div>
    </CopyToClipboard>
  );
};

export const AddressInfoDropdown = ({ address }: AddressInfoDropdownProps) => {
  const { disconnect } = useDisconnect();
  const { chainId } = useAccount();

  // Determine which explorer URL to use based on chainId
  const chain = chainId ? getChainById(chainId) : undefined;
  const explorerUrl = chain?.blockExplorers?.default.url;

  const explorerAddressUrl = explorerUrl && `${explorerUrl}/address/${address}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-max h-[42px] px-3 flex items-center gap-2">
          <BlockieAvatar address={address} size={20} className="rounded-full" />
          <span className="text-sm sm:text-base font-normal">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          <ChevronDownIcon className="size-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4}>
        <DropdownMenuItem>
          <CopyAddressButton address={address} />
        </DropdownMenuItem>
        {explorerAddressUrl && (
          <DropdownMenuItem asChild>
            <a
              href={explorerAddressUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 cursor-pointer w-full"
            >
              View on {chain.name} Explorer
              <ArrowTopRightOnSquareIcon className="h-3 w-3 ml-1" />
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => disconnect()}>Disconnect</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
