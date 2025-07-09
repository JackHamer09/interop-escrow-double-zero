"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountStatusButton } from "./AccountStatusButton";

export const Header = () => {
  const pathname = usePathname();

  return (
    <div className="flex h-[74px] justify-between z-20 w-full p-4">
      <div className="flex items-center">
        <Link href="/repo" passHref className="flex items-center gap-2 ml-4 mr-6 shrink-0">
          <div className="flex relative w-10 h-10">
            <Image alt="ZKsync Prividium logo" className="cursor-pointer" fill src="/logo-dark.svg" />
          </div>
        </Link>
        <nav suppressHydrationWarning className="flex lg:flex-nowrap px-1 gap-6 pr-10">
          <Link
            href="/repo"
            className={`lg:text-lg font-normal leading-tight ${pathname === "/repo" ? "text-blue-400" : "text-gray-400 hover:text-gray-300"}`}
          >
            Intraday Repo
          </Link>
          <Link
            href="/invoice"
            className={`lg:text-lg font-normal leading-tight ${pathname === "/invoice" ? "text-blue-400" : "text-gray-400 hover:text-gray-300"}`}
          >
            Invoice Payment
          </Link>
          <Link
            href="/trade"
            className={`lg:text-lg font-normal leading-tight ${pathname === "/trade" ? "text-blue-400" : "text-gray-400 hover:text-gray-300"}`}
          >
            Escrow Trade
          </Link>
        </nav>
      </div>
      <div className="mr-4">
        <AccountStatusButton />
      </div>
    </div>
  );
};
