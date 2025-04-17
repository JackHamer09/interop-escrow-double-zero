import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  client: {
    NEXT_PUBLIC_CHAIN_ID: z.coerce.number(),
    NEXT_PUBLIC_CHAIN_NAME: z.string().min(1),
    NEXT_PUBLIC_CHAIN_2_ID: z.coerce.number(),
    NEXT_PUBLIC_CHAIN_2_NAME: z.string().min(1),
    NEXT_PUBLIC_CPAMM_ADDRESS: z.string().min(1),
    NEXT_PUBLIC_TRADE_ESCROW_ADDRESS: z.string().min(1),
    NEXT_PUBLIC_DAI_ADDRESS: z.string().min(1),
    NEXT_PUBLIC_DAI_ASSET_ID: z.string().min(1),
    NEXT_PUBLIC_WBTC_ADDRESS: z.string().min(1),
    NEXT_PUBLIC_WBTC_ASSET_ID: z.string().min(1),
    NEXT_PUBLIC_USDG_ADDRESS: z.string().min(1),
    NEXT_PUBLIC_USDG_ASSET_ID: z.string().min(1),
    NEXT_PUBLIC_WAAPL_ADDRESS: z.string().min(1),
    NEXT_PUBLIC_WAAPL_ASSET_ID: z.string().min(1),
    NEXT_PUBLIC_BLOCK_EXPLORER_URL: z.string().url(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
    NEXT_PUBLIC_CHAIN_NAME: process.env.NEXT_PUBLIC_CHAIN_NAME,
    NEXT_PUBLIC_CHAIN_2_ID: process.env.NEXT_PUBLIC_CHAIN_2_ID,
    NEXT_PUBLIC_CHAIN_2_NAME: process.env.NEXT_PUBLIC_CHAIN_2_NAME,
    NEXT_PUBLIC_CPAMM_ADDRESS: process.env.NEXT_PUBLIC_CPAMM_ADDRESS,
    NEXT_PUBLIC_TRADE_ESCROW_ADDRESS: process.env.NEXT_PUBLIC_TRADE_ESCROW_ADDRESS,
    NEXT_PUBLIC_DAI_ADDRESS: process.env.NEXT_PUBLIC_DAI_ADDRESS,
    NEXT_PUBLIC_DAI_ASSET_ID: process.env.NEXT_PUBLIC_DAI_ASSET_ID,
    NEXT_PUBLIC_WBTC_ADDRESS: process.env.NEXT_PUBLIC_WBTC_ADDRESS,
    NEXT_PUBLIC_WBTC_ASSET_ID: process.env.NEXT_PUBLIC_WBTC_ASSET_ID,
    NEXT_PUBLIC_USDG_ADDRESS: process.env.NEXT_PUBLIC_USDG_ADDRESS,
    NEXT_PUBLIC_USDG_ASSET_ID: process.env.NEXT_PUBLIC_USDG_ASSET_ID,
    NEXT_PUBLIC_WAAPL_ADDRESS: process.env.NEXT_PUBLIC_WAAPL_ADDRESS,
    NEXT_PUBLIC_WAAPL_ASSET_ID: process.env.NEXT_PUBLIC_WAAPL_ASSET_ID,
    NEXT_PUBLIC_BLOCK_EXPLORER_URL: process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL,
  },
});
