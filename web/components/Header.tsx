"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RainbowKitCustomConnectButton } from "./RainbowKitCustomConnectButton";

type HeaderMenuLink = {
  label: string;
  href: string;
  icon?: React.ReactNode;
  matches: string[];
};

const menuLinks: HeaderMenuLink[] = [
  {
    label: "Swap",
    href: "/",
    matches: ["/"],
  },
  {
    label: "Pool",
    href: "/pool",
    matches: ["/pool", "/pool/add"],
  },
];

const HeaderMenuLinks = () => {
  const pathname = usePathname();

  return (
    <>
      {menuLinks.map(({ label, href, icon, matches }) => {
        const isActive = matches.some(match => pathname == match);
        return (
          <li key={href}>
            <Link
              href={href}
              passHref
              className={`${
                isActive ? "bg-zinc-700 shadow-md" : ""
              } hover:bg-zinc-700 hover:shadow-md py-1.5 px-3 text-sm rounded-md gap-2 grid grid-flow-col`}
            >
              {icon}
              <span>{label}</span>
            </Link>
          </li>
        );
      })}
    </>
  );
};

/**
 * Site header
 */
export const Header = () => {
  return (
    <div className="flex min-h-16 justify-between z-20 w-full p-4">
      <div>
        <Link href="/" passHref className="hidden md:flex items-center gap-2 ml-4 mr-6 shrink-0">
          <div className="flex relative w-10 h-10">
            <Image alt="Double Zero Swap logo" className="cursor-pointer" fill src="/logo-dark.svg" />
          </div>
          <span className="text-xl font-normal">Double Zero Swap</span>
        </Link>
      </div>
      <ul className="hidden md:flex lg:flex-nowrap menu menu-horizontal px-1 gap-2">
        <HeaderMenuLinks />
      </ul>
      <div className="mr-4">
        <RainbowKitCustomConnectButton />
      </div>
    </div>
  );
};
