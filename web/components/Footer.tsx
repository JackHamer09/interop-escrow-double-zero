import React from "react";
import { HeartIcon } from "@heroicons/react/24/solid";
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
        href="https://matter-labs.io/"
        target="_blank"
        rel="noreferrer"
      >
        <span className="hover:underline">Matter Labs</span>
      </a>
      and
      <a
        className="flex justify-center items-center gap-1"
        href="https://moonsonglabs.com/"
        target="_blank"
        rel="noreferrer"
      >
        <span className="hover:underline">Moonsong Labs</span>
      </a>
    </div>
  );
};
