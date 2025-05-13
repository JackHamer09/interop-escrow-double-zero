"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// Constants for timing configuration
const FADE_DURATION_MS = 300;
const HYDRATION_BUFFER_MS = 600;
const FALLBACK_TIMEOUT_MS = 2000;

export const PageLoader = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const [jsLoaded, setJsLoaded] = useState(false);
  const [progressComplete, setProgressComplete] = useState(false);

  useEffect(() => {
    // Mark JS as loaded (this effect running means JS is now available)
    setJsLoaded(true);

    // Function to complete the progress once page is ready
    const completeProgress = () => {
      setProgressComplete(true);

      // Add a small delay to ensure app has had time to hydrate
      setTimeout(() => {
        // Start fade out animation
        setIsFading(true);

        // Remove loader after animation completes
        setTimeout(() => {
          setIsLoading(false);
        }, FADE_DURATION_MS);
      }, HYDRATION_BUFFER_MS);
    };

    // Check if document is fully loaded
    const handleLoaded = () => {
      if (document.readyState === "complete") {
        completeProgress();
      }
    };

    // Check if already loaded
    if (document.readyState === "complete") {
      completeProgress();
    } else {
      // Add event listeners for load events
      window.addEventListener("load", handleLoaded);
      document.addEventListener("readystatechange", handleLoaded);

      // Fallback in case events don't fire
      const fallbackTimer = setTimeout(() => {
        completeProgress();
      }, FALLBACK_TIMEOUT_MS);

      return () => {
        window.removeEventListener("load", handleLoaded);
        document.removeEventListener("readystatechange", handleLoaded);
        clearTimeout(fallbackTimer);
      };
    }
  }, []);

  if (!isLoading) return null;

  return (
    <div
      className={`fixed inset-0 z-50 bg-gradient-to-b from-gray-900 to-black flex flex-col items-center justify-center p-6 text-center transition-opacity duration-300 ${isFading ? "opacity-0" : "opacity-100"}`}
    >
      <div className="relative w-28 h-28 mb-8">
        <Image alt="Double Zero Swap logo" fill src="/logo-dark.svg" />
      </div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2 text-white">ZKsync Prividium Escrow Trade</h2>
      </div>

      {/* Progress bar */}
      <div className="w-64 h-3 bg-gray-800 rounded-full overflow-hidden">
        <div className="animate-pulse h-full w-full">
          <div
            className={`h-full bg-gradient-to-r from-blue-500 to-indigo-600
                      ${!jsLoaded ? "initial-progress" : ""} 
                      ${progressComplete ? "w-full transition-all duration-500 ease-out" : jsLoaded ? "w-[70%]" : ""}`}
          ></div>
        </div>
      </div>
    </div>
  );
};
