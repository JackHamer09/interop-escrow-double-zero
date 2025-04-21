import { ArrowLeftOnRectangleIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useDisconnect } from "wagmi";
import { useRpcLogin } from "~~/hooks/use-rpc-login";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";

export const WrongNetworkDropdown = () => {
  const { disconnect } = useDisconnect();
  const { logout: rpcLogout } = useRpcLogin();
  const logout = () => {
    rpcLogout();
    disconnect();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="min-h-[42px] h-[42px] dropdown-toggle gap-1 bg-red-500 text-white hover:bg-red-600">
          <span>Wrong network</span>
          <ChevronDownIcon className="h-6 w-4 ml-2 sm:ml-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="dropdown-content">
        <DropdownMenuItem onClick={() => logout()} className="text-red-500 flex gap-3 py-3 hover:text-red-500">
          <ArrowLeftOnRectangleIcon className="h-6 w-4 ml-2 sm:ml-0" />
          <span>Disconnect</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
