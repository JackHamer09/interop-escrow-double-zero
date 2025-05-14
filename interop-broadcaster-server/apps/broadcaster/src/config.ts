import { config, } from "dotenv";
import { parseUnits } from "viem";
config();

const {
  NODE_ENV,
  RELEASE_VERSION,
  PORT,
  METRICS_PORT,
  GRACEFUL_SHUTDOWN_TIMEOUT_MS,
  MINTER_PRIVATE_KEY,
  USDC_CHAIN_A_ADDRESS,
  TTBILL_CHAIN_A_ADDRESS,
  USDC_ASSET_ID,
  TTBILL_ASSET_ID,
  ETH_MINT_AMOUNT,
  USDC_MINT_AMOUNT,
  TTBILL_MINT_AMOUNT,
} = process.env;

export default {
  NODE_ENV,
  release: { version: RELEASE_VERSION || null },
  port: parseInt(PORT, 10) || 3030,
  metrics: { port: parseInt(METRICS_PORT, 10) || 3005 },
  gracefulShutdownTimeoutMs: parseInt(GRACEFUL_SHUTDOWN_TIMEOUT_MS, 10) || 0,
  minter: {
    privateKey: MINTER_PRIVATE_KEY,
  },
  tokens: {
    usdcChainA: USDC_CHAIN_A_ADDRESS,
    ttbillChainA: TTBILL_CHAIN_A_ADDRESS,
    usdcAssetId: USDC_ASSET_ID,
    ttbillAssetId: TTBILL_ASSET_ID,
  },
  mintAmounts: {
    eth: ETH_MINT_AMOUNT ? parseUnits(ETH_MINT_AMOUNT, 18) : parseUnits("10", 18),
    usdc: USDC_MINT_AMOUNT ? parseUnits(USDC_MINT_AMOUNT, 18) : parseUnits("100", 18),
    ttbill: TTBILL_MINT_AMOUNT ? parseUnits(TTBILL_MINT_AMOUNT, 18) : parseUnits("100", 18),
  },
};
