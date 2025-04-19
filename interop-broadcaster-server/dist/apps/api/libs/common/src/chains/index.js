"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChainById = exports.isChainIdSupported = exports.supportedChains = exports.chain2 = exports.chain1 = void 0;
const viem_1 = require("viem");
const zksync_1 = require("viem/zksync");
exports.chain1 = (0, viem_1.defineChain)(Object.assign(Object.assign({}, zksync_1.chainConfig), { id: 271, name: 'Interop Chain 1', network: 'interop-chain-1', nativeCurrency: {
        decimals: 18,
        name: 'Ether',
        symbol: 'ETH',
    }, rpcUrls: {
        default: {
            http: ['http://127.0.0.1:3050'],
        },
    } }));
exports.chain2 = (0, viem_1.defineChain)(Object.assign(Object.assign({}, zksync_1.chainConfig), { id: 260, name: 'Interop Chain 2', network: 'interop-chain-2', nativeCurrency: {
        decimals: 18,
        name: 'Ether',
        symbol: 'ETH',
    }, rpcUrls: {
        default: {
            http: ['http://127.0.0.1:3150'],
        },
    } }));
exports.supportedChains = [exports.chain1, exports.chain2];
const isChainIdSupported = (_chainId) => {
    const chainId = typeof _chainId === "string" ? parseInt(_chainId) : _chainId;
    return exports.supportedChains.some((chain) => chain.id === chainId);
};
exports.isChainIdSupported = isChainIdSupported;
const getChainById = (chainId) => {
    return exports.supportedChains.find((chain) => chain.id === chainId) || null;
};
exports.getChainById = getChainById;
//# sourceMappingURL=index.js.map