"use client";

import React from "react";
import { ExplanationButton } from "./ExplanationScreen";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { HeartIcon } from "@heroicons/react/24/solid";
import { chain1, chain2 } from "~~/config/chains-config";
import { cn } from "~~/utils/cn";

/**
 * Site footer
 */
export const Footer = ({ className }: { className?: string }) => {
  return (
    <div className={cn("flex justify-center flex-wrap items-center gap-2 py-5 w-full text-sm", className)}>
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
      <div className="mx-2">|</div>
      <ExplanationButton />
      <div className="mx-2">|</div>
      <a
        className="flex justify-center items-center gap-1 whitespace-nowrap"
        href={chain1.blockExplorers.default.url}
        target="_blank"
        rel="noreferrer"
      >
        <span className="hover:underline">{chain1.name} Explorer</span>
        <ArrowTopRightOnSquareIcon className="h-3 w-3" />
      </a>
      <div className="mx-2">|</div>
      <a
        className="flex justify-center items-center gap-1 whitespace-nowrap"
        href={chain2.blockExplorers.default.url}
        target="_blank"
        rel="noreferrer"
      >
        <span className="hover:underline">{chain2.name} Explorer</span>
        <ArrowTopRightOnSquareIcon className="h-3 w-3" />
      </a>
    </div>
  );
};
