"use client";

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

interface AddressInfoDropdownProps {
  address: Address;
}

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
          <AddressDisplay address={address} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4}>
        <DropdownMenuItem onClick={() => disconnect()}>
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};