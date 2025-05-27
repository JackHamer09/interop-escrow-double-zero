import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  client: {
    NEXT_PUBLIC_CHAIN_ID: z.coerce.number(),
    NEXT_PUBLIC_CHAIN_NAME: z.string().min(1),
    NEXT_PUBLIC_TRADE_ESCROW_ADDRESS: z.string().min(1),
    NEXT_PUBLIC_USDC_ADDRESS: z.string().min(1),
    NEXT_PUBLIC_TTBILL_ADDRESS: z.string().min(1),
    NEXT_PUBLIC_AUTH_API_URL: z.string().url(),
    NEXT_PUBLIC_BASE_RPC_URL: z.string().url(),
    NEXT_PUBLIC_BLOCK_EXPLORER_URL: z.string().url(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
    NEXT_PUBLIC_CHAIN_NAME: process.env.NEXT_PUBLIC_CHAIN_NAME,
    NEXT_PUBLIC_TRADE_ESCROW_ADDRESS: process.env.NEXT_PUBLIC_TRADE_ESCROW_ADDRESS,
    NEXT_PUBLIC_USDC_ADDRESS: process.env.NEXT_PUBLIC_USDC_ADDRESS,
    NEXT_PUBLIC_TTBILL_ADDRESS: process.env.NEXT_PUBLIC_TTBILL_ADDRESS,
    NEXT_PUBLIC_AUTH_API_URL: process.env.NEXT_PUBLIC_AUTH_API_URL,
    NEXT_PUBLIC_BASE_RPC_URL: process.env.NEXT_PUBLIC_BASE_RPC_URL,
    NEXT_PUBLIC_BLOCK_EXPLORER_URL: process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL,
  },
});
