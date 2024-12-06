import { useDisconnect } from "wagmi";
import { ArrowLeftOnRectangleIcon, ArrowTopRightOnSquareIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { env } from "~~/utils/env";

export const WrongNetworkDropdown = () => {
  const { disconnect } = useDisconnect();

  return (
    <div className="dropdown dropdown-end mr-2">
      <label tabIndex={0} className="btn btn-error min-h-[42px] h-[42px] dropdown-toggle gap-1">
        <span>Wrong network</span>
        <ChevronDownIcon className="h-6 w-4 ml-2 sm:ml-0" />
      </label>
      <ul tabIndex={0} className="dropdown-content menu p-2 mt-1 bg-white shadow-lg rounded-box gap-1">
        <li>
          <a
            href={`${env.NEXT_PUBLIC_BLOCK_EXPLORER_URL}`}
            target="_blank"
            rel="noreferrer"
            className="menu-item btn-sm !rounded-xl flex gap-3 py-3 whitespace-nowrap"
            type="button"
          >
            <ArrowTopRightOnSquareIcon className="h-6 w-4 ml-2 sm:ml-0" />
            <span>Generate Private RPC</span>
          </a>
        </li>
        <li>
          <button
            className="menu-item text-error btn-sm !rounded-xl flex gap-3 py-3"
            type="button"
            onClick={() => disconnect()}
          >
            <ArrowLeftOnRectangleIcon className="h-6 w-4 ml-2 sm:ml-0" />
            <span>Disconnect</span>
          </button>
        </li>
      </ul>
    </div>
  );
};
