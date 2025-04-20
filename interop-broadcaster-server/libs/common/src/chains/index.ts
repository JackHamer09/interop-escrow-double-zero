import { defineChain } from 'viem';
import { chainConfig } from 'viem/zksync';

export const chain1 = defineChain({
  ...chainConfig,
  id: 271,
  name: 'Chain A',
  network: 'chain-a',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:3050'],
    },
  },
});
export const chain2 = defineChain({
  ...chainConfig,
  id: 260,
  name: 'Chain B',
  network: 'chain-b',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:3150'],
    },
  },
});


export const supportedChains = [chain1, chain2];

export type SupportedChainId = typeof supportedChains[number]["id"];

export const isChainIdSupported = (_chainId: string | number,): boolean => {
  const chainId = typeof _chainId === "string" ? parseInt(_chainId,) : _chainId;
  return supportedChains.some((chain,) => chain.id === chainId,);
};
export const getChainById = (chainId: number,): typeof supportedChains[number] | null => {
  return supportedChains.find((chain,) => chain.id === chainId,) || null;
};
