import { type Chain, createWalletClient, custom, http } from "viem";
import { createConfig } from "wagmi";
import { metaMask } from "wagmi/connectors";
import { allChains, chainsAuthEndpoints } from "~~/config/chains-config";
import { getStoredAuth } from "~~/hooks/use-rpc-login";

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

        const supportedPrivateChains = Object.keys(chainsAuthEndpoints);
        const isPrivateChain = supportedPrivateChains.map(id => parseInt(id)).includes(chain.id);

        // Signature request or non-private-chain requests
        if (params?.from || !isPrivateChain || method === "wallet_addEthereumChain") {
          const response = await window.ethereum.request({ method, params });
          return response;
        }

        const walletChainId: number = await window.ethereum
          .request({ method: "eth_chainId" })
          .then((res: string) => parseInt(res, 16))
          .catch((err: string) => {
            throw new Error("Failed to get wallet chain ID: " + err);
          });

        if (walletChainId === chain.id) {
          try {
            const response = await window.ethereum.request({ method, params });
            return response;
          } catch (error) {
            console.warn(
              "Tried to request through wallet but failed",
              { clientChain: chain.id, method, params },
              (error as any)?.data?.message,
            );
          }
        }

        // Check if user has auth token for the requested chain
        const auth = getStoredAuth();
        const chainTokens = auth?.tokens[chain.id] || {};
        const authToken = auth ? chainTokens[auth.activeAddress || ""] : undefined;

        if (!authToken) {
          throw {
            code: -32001,
            message: `User is not authenticated for chain ${chain.id}`,
          };
        }

        const authEndpoints = chainsAuthEndpoints[chain.id];
        if (!authEndpoints) {
          throw new Error(`No auth endpoints configured for chain ${chain.id}`);
        }

        const fullRpcUrl = `${authEndpoints.baseRpcUrl}/${authToken}`;
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
