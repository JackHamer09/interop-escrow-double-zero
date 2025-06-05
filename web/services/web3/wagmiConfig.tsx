import { type Chain, createWalletClient, custom, http } from "viem";
import { createConfig } from "wagmi";
import { metaMask } from "wagmi/connectors";
import { allChains, chain1 } from "~~/config/chains-config";
import { getStoredAuth } from "~~/hooks/use-rpc-login";
import { env } from "~~/utils/env";

/**
 * Helper function to check if MetaMask is available
 */
export const isMetaMaskAvailable = () => {
  return typeof window !== "undefined" && typeof window.ethereum !== "undefined" && window.ethereum.isMetaMask;
};

/**
 * Creates a wallet client for the specified chain
 */
export const createMetaMaskClient = ({ chain }: { chain: Chain }) => {
  return createWalletClient({
    chain,
    pollingInterval: 500,
    transport: custom({
      async request({ method, params }) {
        if (!isMetaMaskAvailable()) {
          throw new Error("MetaMask is not available");
        }

        const mainChainId = chain1.id;
        if (params?.from || chain.id !== mainChainId || method === "wallet_addEthereumChain") {
          // Signature request or non-main-chain requests
          const response = await window.ethereum!.request({ method, params });
          return response;
        }

        const walletChainId: number =
          (await window.ethereum
            ?.request({ method: "eth_chainId" })
            .then((res: string) => parseInt(res, 16))
            .catch(() => 0)) || 0;
        if (walletChainId === mainChainId) {
          try {
            const response = await window.ethereum!.request({ method, params });
            return response;
          } catch (error) {
            console.warn(
              "Tried to request through wallet but failed",
              { clientChain: chain.id, method, params },
              (error as any)?.data?.message,
            );
          }
        }

        const auth = getStoredAuth();
        if (!auth || !auth.activeAddress || !auth.tokens[auth.activeAddress]) {
          throw {
            code: -32001,
            message: "User is not authenticated",
          };
        }
        const rpcUrl = env.NEXT_PUBLIC_CHAIN_A_BASE_RPC_URL;
        const fullRpcUrl = `${rpcUrl}/${auth.tokens[auth.activeAddress]}`;
        const provider = http(fullRpcUrl)({ chain });
        const response = await provider.request({ method, params });
        return response;
      },
    }),
  });
};

export const wagmiConfig = createConfig({
  chains: allChains,
  connectors: [metaMask()],
  client: createMetaMaskClient as any,
});
