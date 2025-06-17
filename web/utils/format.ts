import { formatUnits } from "viem";

/**
 * Formats a bigint amount to a string with a maximum of 4 decimals
 * @param amount The amount to format as bigint
 * @param decimals The number of decimals to use for formatting
 * @returns Formatted amount string with up to 4 decimals
 */
export function formatAmount(amount: bigint, decimals: number): string {
  const fullAmount = formatUnits(amount, decimals);
  const parts = fullAmount.split(".");
  if (parts.length === 1) return fullAmount;
  
  // Limit decimals to a maximum of 4
  const integerPart = parts[0];
  const decimalPart = parts[1].substring(0, 4);
  
  // Remove trailing zeros
  const trimmedDecimal = decimalPart.replace(/0+$/, "");
  
  if (trimmedDecimal) {
    return `${integerPart}.${trimmedDecimal}`;
  }
  return integerPart;
}