import { formatUnits } from "viem";

export function formatToken(amount: bigint | number | string) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 5 }).format(Number(amount));
}

export function formatTokenWithDecimals(amount: bigint, decimals = 18) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 5 }).format(Number(formatUnits(amount, decimals)));
}
