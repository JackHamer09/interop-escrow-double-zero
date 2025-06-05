"use client";

import { blo } from "blo";
import { Address } from "viem";

interface BlockieAvatarProps {
  address: Address;
  size?: number;
  ensImage?: string | null;
  className?: string;
}

// Custom Avatar component using blo for blockie generation
export const BlockieAvatar = ({ address, ensImage, size = 24, className = "" }: BlockieAvatarProps) => (
  // Don't want to use nextJS Image here (and adding remote patterns for the URL)
  // eslint-disable-next-line @next/next/no-img-element
  <img
    className={`rounded-full ${className}`}
    src={ensImage || blo(address as `0x${string}`)}
    width={size}
    height={size}
    alt={`${address} avatar`}
  />
);
