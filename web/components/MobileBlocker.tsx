"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export const MobileBlocker = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 550);
    };

    // Check on initial render
    checkScreenSize();

    // Add event listener for resize
    window.addEventListener("resize", checkScreenSize);

    // Clean up
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  if (!isMobile) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black bg-opacity-95 flex flex-col items-center justify-center p-6 text-center">
      <div className="mb-6 relative w-20 h-20">
        <Image alt="ZKsync Prividium logo" fill src="/logo-dark.svg" />
      </div>
      <h2 className="text-2xl font-semibold mb-3">Desktop Only</h2>
      <p className="text-gray-400 max-w-xs">Sorry, this demo is currently supported only on desktop devices.</p>
    </div>
  );
};
