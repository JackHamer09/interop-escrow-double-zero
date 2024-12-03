"use client";

import { useTheme as useNextTheme } from "next-themes";

export default function useTheme() {
  const { resolvedTheme } = useNextTheme();

  return {
    isDarkMode: resolvedTheme === "dark",
    isLightMode: resolvedTheme === "light",
    isLoadingTheme: resolvedTheme === undefined,
  };
}
