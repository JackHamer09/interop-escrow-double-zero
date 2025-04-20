import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { useDisconnect } from "wagmi";
import { ArrowLeftOnRectangleIcon, ArrowTopRightOnSquareIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

export const WrongNetworkDropdown = () => {
  const { disconnect } = useDisconnect();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="min-h-[42px] h-[42px] dropdown-toggle gap-1 bg-red-500 text-white hover:bg-red-600">
          <span>Wrong network</span>
          <ChevronDownIcon className="h-6 w-4 ml-2 sm:ml-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="dropdown-content">
        <DropdownMenuItem onClick={() => disconnect()} className="text-red-500 flex gap-3 py-3 hover:text-red-500">
          <ArrowLeftOnRectangleIcon className="h-6 w-4 ml-2 sm:ml-0" />
          <span>Disconnect</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
