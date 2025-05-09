"use client";

import { useState } from "react";
import { useDisconnect } from "wagmi";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { BlockieAvatar } from "../BlockieAvatar";
import { Address as AddressDisplay } from "../Address/Address";
import { Address } from "viem";
import CopyToClipboard from "react-copy-to-clipboard";

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
      <div className="flex items-center cursor-pointer w-full">
        {copied ? "Copied!" : "Copy address"}
      </div>
    </CopyToClipboard>
  );
};

export const AddressInfoDropdown = ({ address }: AddressInfoDropdownProps) => {
  const { disconnect } = useDisconnect();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="min-h-[42px] h-[42px] pl-2 pr-3 flex items-center gap-2"
        >
          <BlockieAvatar
            address={address}
            size={24}
            className="rounded-full"
          />
          <span className="ml-1.5 text-base font-normal">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4}>
        <DropdownMenuItem>
          <CopyAddressButton address={address} />
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => disconnect()}>
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};