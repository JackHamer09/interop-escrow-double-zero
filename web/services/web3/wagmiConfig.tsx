import { type Chain, createWalletClient, custom, http } from "viem";
import { createConfig } from "wagmi";
import { metaMask } from "wagmi/connectors";
import { allChains, chain1, chain3 } from "~~/config/chains-config";
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

        const supportedPrivateChains = [chain1.id, chain3.id];
        const isPrivateChain = supportedPrivateChains.includes(chain.id);

        if (params?.from || !isPrivateChain || method === "wallet_addEthereumChain") {
          // Signature request or non-private-chain requests
          const response = await window.ethereum!.request({ method, params });
          return response;
        }

        const walletChainId: number =
          (await window.ethereum
            ?.request({ method: "eth_chainId" })
            .then((res: string) => parseInt(res, 16))
            .catch(() => 0)) || 0;

        if (walletChainId === chain.id) {
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
        if (!auth || !auth.activeAddress) {
          throw {
            code: -32001,
            message: "User is not authenticated",
          };
        }

        // Check if user has auth token for the requested chain
        const chainTokens = auth.tokens[chain.id];
        const authToken = chainTokens?.[auth.activeAddress];

        if (!authToken) {
          throw {
            code: -32001,
            message: `User is not authenticated for chain ${chain.id}`,
          };
        }

        // Get the appropriate RPC URL for the chain
        const baseRpcUrl =
          chain.id === chain1.id ? env.NEXT_PUBLIC_CHAIN_A_BASE_RPC_URL : env.NEXT_PUBLIC_CHAIN_C_BASE_RPC_URL;

        const fullRpcUrl = `${baseRpcUrl}/${authToken}`;
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
