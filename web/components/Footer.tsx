import React from "react";
import Image from "next/image";
import { HeartIcon } from "@heroicons/react/24/solid";
import { cn } from "~~/utils/cn";

/**
 * Site footer
 */
export const Footer = ({ className }: { className?: string }) => {
  return (
    <div className={cn("py-5 w-full", className)}>
      <ul className="menu menu-horizontal w-full">
        <div className="flex justify-center items-center gap-2 text-sm w-full">
          <div className="flex justify-center items-center gap-2">
            <p className="m-0 text-center">
              Built with <HeartIcon className="inline-block h-4 w-4 text-red-500" /> at
            </p>
            <a
              className="flex justify-center items-center gap-1"
              href="https://moonsonglabs.com/"
              target="_blank"
              rel="noreferrer"
            >
              <Image src="msl-dark.svg" alt="Moonsong Labs" width={16} height={16} className="" />
              <span className="hover:underline">Moonsong Labs</span>
            </a>
          </div>
        </div>
      </ul>
    </div>
  );
};
