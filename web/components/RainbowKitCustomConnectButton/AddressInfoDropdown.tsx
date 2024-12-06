import { useRef, useState } from "react";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "../ui/dropdown-menu";
import CopyToClipboard from "react-copy-to-clipboard";
import { getAddress } from "viem";
import { Address } from "viem";
import { useDisconnect } from "wagmi";
import { ArrowLeftOnRectangleIcon, CheckCircleIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { BlockieAvatar } from "~~/components/BlockieAvatar";
import { useOutsideClick } from "~~/hooks/use-outside-click";
import { cn } from "~~/utils/cn";

type AddressInfoDropdownProps = {
  address: Address;
  ensAvatar?: string;
};

export const AddressInfoDropdown = ({ address, ensAvatar }: AddressInfoDropdownProps) => {
  const { disconnect } = useDisconnect();
  const checkSumAddress = getAddress(address);

  const [addressCopied, setAddressCopied] = useState(false);

  const [selectingNetwork, setSelectingNetwork] = useState(false);
  const dropdownRef = useRef<HTMLDetailsElement>(null);
  const closeDropdown = () => {
    setSelectingNetwork(false);
    dropdownRef.current?.removeAttribute("open");
  };
  useOutsideClick(dropdownRef, closeDropdown);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <BlockieAvatar address={checkSumAddress} size={24} ensImage={ensAvatar} />
          <span className="ml-2 mr-1">{checkSumAddress?.slice(0, 6) + "..." + checkSumAddress?.slice(-4)}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="flex flex-col gap-2 p-2">
        <div className={selectingNetwork ? "hidden" : ""}>
          {addressCopied ? (
            <DropdownButton className="flex justify-start">
              <CheckCircleIcon className="text-xl font-normal h-6 w-4 cursor-pointer ml-2 sm:ml-0" aria-hidden="true" />
              <span className="whitespace-nowrap">Copy address</span>
            </DropdownButton>
          ) : (
            <CopyToClipboard
              text={checkSumAddress}
              onCopy={() => {
                setAddressCopied(true);
                setTimeout(() => {
                  setAddressCopied(false);
                }, 800);
              }}
            >
              <DropdownButton className="flex justify-start">
                <DocumentDuplicateIcon
                  className="text-xl font-normal h-6 w-4 cursor-pointer ml-2 sm:ml-0"
                  aria-hidden="true"
                />
                <span className="whitespace-nowrap">Copy address</span>
              </DropdownButton>
            </CopyToClipboard>
          )}
        </div>
        <DropdownButton
          className={cn("text-red-500 flex justify-start hover:text-red-500", selectingNetwork ? "hidden" : "")}
          onClick={() => disconnect()}
        >
          <ArrowLeftOnRectangleIcon className="h-6 w-4 ml-2 sm:ml-0" /> <span>Disconnect</span>
        </DropdownButton>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

function DropdownButton({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Button className={cn("flex justify-start w-full", className)} onClick={onClick} variant="ghost">
      {children}
    </Button>
  );
}
