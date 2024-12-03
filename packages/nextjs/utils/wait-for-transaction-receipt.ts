import {
  WaitForTransactionReceiptParameters,
  waitForTransactionReceipt as wagmiWaitForTransactionReceipt,
} from "wagmi/actions";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";

export default function waitForTransactionReceipt(
  options: WaitForTransactionReceiptParameters<typeof wagmiConfig, (typeof wagmiConfig.chains)[number]["id"]>,
) {
  const defaultOptions = {
    confirmations: 0,
  } satisfies Partial<
    WaitForTransactionReceiptParameters<typeof wagmiConfig, (typeof wagmiConfig.chains)[number]["id"]>
  >;

  return wagmiWaitForTransactionReceipt<typeof wagmiConfig, (typeof wagmiConfig.chains)[number]["id"]>(wagmiConfig, {
    ...defaultOptions,
    ...options,
  });
}
