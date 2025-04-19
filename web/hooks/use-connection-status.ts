import { useAccount } from "wagmi";
import { chain1, chain2 } from "~~/services/web3/wagmiConfig";

export function useConnectionStatus() {
  const account = useAccount();

  return {
    isConnected: account.isConnected,
    walletAndRpcMatch: account.chainId && [chain1.id, chain2.id].includes(account.chainId),
  };
}
