import React from "react";
import Image from "next/image";
import { HeartIcon } from "@heroicons/react/24/solid";
import MslLogo from "~~/assets/msl.svg";
import { cn } from "~~/utils/cn";

/**
 * Site footer
 */
export const Footer = ({ className }: { className?: string }) => {
  return (
    <div className={cn("flex justify-center items-center gap-2 py-5 w-full text-sm", className)}>
      <p className="m-0 text-center">
        Built with <HeartIcon className="inline-block h-4 w-4 text-red-500" /> at
      </p>
      <a
        className="flex justify-center items-center gap-1"
        href="https://moonsonglabs.com/"
        target="_blank"
        rel="noreferrer"
      >
        <Image src={MslLogo} alt="Moonsong Labs" width={16} height={16} className="mr-1" />
        <span className="hover:underline">Moonsong Labs</span>
      </a>
    </div>
  );
};
