"use client";

import Image from "next/image";
import Link from "next/link";
import { AccountStatusButton } from "./AccountStatusButton";

export const Header = () => {
  return (
    <div className="flex h-[74px] justify-between z-20 w-full p-4">
      <Link href="/trade" passHref className="hidden md:flex items-center gap-2 ml-4 mr-6 shrink-0">
        <div className="flex relative w-10 h-10">
          <Image alt="Double Zero Swap logo" className="cursor-pointer" fill src="/logo-dark.svg" />
        </div>
        <span className="text-xl font-normal">Escrow Trade</span>
      </Link>
      <nav suppressHydrationWarning className="hidden md:flex lg:flex-nowrap px-1 gap-2"></nav>
      <div className="mr-4">
        <AccountStatusButton />
      </div>
    </div>
  );
};
