"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var InteropBroadcasterService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InteropBroadcasterService = void 0;
const viem_1 = require("viem");
const ethers = require("ethers");
const zksync = require("zksync-ethers-interop-support");
const common_1 = require("@nestjs/common");
const constants_1 = require("../../../../libs/common/src/utils/constants");
const chains_1 = require("../../../../libs/common/src/chains");
const client_1 = require("../client");
const transaction_watch_1 = require("../transaction-watch");
const temp_sdk_1 = require("./temp-sdk");
let InteropBroadcasterService = InteropBroadcasterService_1 = class InteropBroadcasterService {
    constructor(clientService, transactionWatch) {
        this.clientService = clientService;
        this.transactionWatch = transactionWatch;
        this.transactionStatusMap = new Map();
        this.logger = new common_1.Logger(InteropBroadcasterService_1.name);
        this.transactionWatch.subscribeToTransactionReceipt(this.onNewTransactionReceipt.bind(this));
    }
    getTransactionKey(chainId, transactionHash) {
        return `${chainId}-${transactionHash}`;
    }
    decodeChainId(chainId) {
        let decodedChainId;
        if (chains_1.supportedChains.some((chain) => chain.id === parseInt(chainId, 10))) {
            decodedChainId = parseInt(chainId, 10);
        }
        else {
            decodedChainId = parseInt(chainId, 16);
        }
        return decodedChainId;
    }
    async onNewTransactionReceipt({ receipt, chainId }) {
        if ((0, viem_1.getAddress)(receipt.to) !== (0, viem_1.getAddress)(constants_1.L2_INTEROP_CENTER_ADDRESS))
            return;
        const senderChain = chains_1.supportedChains.find((chain) => chain.id === chainId);
        this.logger.debug(`[${(senderChain === null || senderChain === void 0 ? void 0 : senderChain.name) || chainId}] New Transaction Receipt: ${receipt.transactionHash}`);
        const transactionKey = this.getTransactionKey(chainId, receipt.transactionHash);
        const senderClient = this.clientService.getClient({ chainId });
        const senderProvider = new zksync.Provider(senderChain.rpcUrls.default.http[0]);
        try {
            this.transactionStatusMap.set(transactionKey, {
                status: 'waiting_finalization',
                senderChainId: chainId,
                destinationChainId: null,
                transactionHash: receipt.transactionHash
            });
            await this.waitUntilBlockFinalized(senderClient, receipt.blockNumber);
            this.transactionStatusMap.set(transactionKey, {
                status: "processing",
                senderChainId: chainId,
                destinationChainId: null,
                transactionHash: receipt.transactionHash
            });
            const [feeBundle, executionBundle, triggerDataBundle] = await Promise.all([
                (0, temp_sdk_1.getInteropBundleData)(senderProvider, receipt.transactionHash, 0),
                (0, temp_sdk_1.getInteropBundleData)(senderProvider, receipt.transactionHash, 1),
                (0, temp_sdk_1.getInteropTriggerData)(senderProvider, receipt.transactionHash, 2),
            ]);
            if (!triggerDataBundle.output)
                throw new Error('Trigger data bundle is empty');
            const destinationChainId = this.decodeChainId(triggerDataBundle.output.destinationChainId);
            const destinationChain = chains_1.supportedChains.find((c) => c.id === destinationChainId);
            this.transactionStatusMap.set(transactionKey, {
                status: "processing",
                senderChainId: chainId,
                destinationChainId: destinationChainId,
                transactionHash: receipt.transactionHash
            });
            if (!destinationChain)
                throw new Error(`Unsupported chainId: ${destinationChainId}`);
            const destinationClient = this.clientService.getClient({ chainId: destinationChainId });
            const destinationProvider = new zksync.Provider(destinationChain.rpcUrls.default.http[0]);
            const transactionData = ethers.AbiCoder.defaultAbiCoder().encode(['bytes', 'bytes'], [executionBundle.rawData, executionBundle.fullProof]);
            const nonce = await destinationClient.getTransactionCount({ address: constants_1.L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS });
            const feeData = await destinationProvider.getFeeData();
            const interopTx = {
                from: constants_1.L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS,
                to: constants_1.L2_INTEROP_HANDLER_ADDRESS,
                chainId: destinationChain.id,
                data: transactionData,
                nonce,
                customData: {
                    paymasterParams: {
                        paymaster: triggerDataBundle.output.gasFields.paymaster,
                        paymasterInput: triggerDataBundle.output.gasFields.paymasterInput,
                    },
                    gasPerPubdata: triggerDataBundle.output.gasFields.gasPerPubdataByteLimit,
                    customSignature: ethers.AbiCoder.defaultAbiCoder().encode(['bytes', 'bytes', 'address', 'address', 'bytes'], [
                        feeBundle.rawData,
                        feeBundle.fullProof,
                        triggerDataBundle.output.from,
                        triggerDataBundle.output.gasFields.refundRecipient,
                        triggerDataBundle.fullProof,
                    ]),
                },
                maxFeePerGas: feeData.maxFeePerGas,
                maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
                gasLimit: triggerDataBundle.output.gasFields.gasLimit,
                value: 0,
            };
            this.transactionStatusMap.set(transactionKey, {
                status: 'broadcasting',
                senderChainId: chainId,
                destinationChainId,
                transactionHash: receipt.transactionHash,
            });
            const hexTx = zksync.utils.serializeEip712(interopTx);
            const broadcastTx = await destinationProvider.broadcastTransaction(hexTx);
            this.logger.debug(`[${senderChain.name}] Interop transaction sent to ${destinationChain.name}: ${broadcastTx.hash}`);
            await broadcastTx.wait();
            this.transactionStatusMap.set(transactionKey, {
                status: 'completed',
                senderChainId: chainId,
                destinationChainId,
                transactionHash: receipt.transactionHash,
                broadcastTransactionHash: broadcastTx.hash,
            });
        }
        catch (err) {
            this.logger.error(`Interop transaction processing failed for chain ${chainId}, transaction: ${receipt.transactionHash}`);
            this.logger.error(err);
            const currentTx = this.transactionStatusMap.get(transactionKey);
            this.transactionStatusMap.set(transactionKey, {
                status: (currentTx === null || currentTx === void 0 ? void 0 : currentTx.status) === "broadcasting" ? "broadcasting_failed" : "processing_failed",
                senderChainId: chainId,
                destinationChainId: currentTx === null || currentTx === void 0 ? void 0 : currentTx.destinationChainId,
                transactionHash: receipt.transactionHash,
            });
        }
    }
    async getInteropTransactionStatus(chainId, transactionHash) {
        const key = this.getTransactionKey(chainId, transactionHash);
        const POLL_FOR_STATUS = 15000;
        const start = Date.now();
        while (Date.now() - start < POLL_FOR_STATUS) {
            const found = this.transactionStatusMap.get(key);
            if (found)
                return found;
            await new Promise((res) => setTimeout(res, 250));
        }
        return { status: 'not_found', senderChainId: chainId, destinationChainId: null, transactionHash };
    }
    async waitUntilBlockFinalized(client, blockNumber) {
        while (true) {
            const block = await client.getBlock({ blockTag: 'finalized' });
            if (blockNumber <= block.number)
                break;
            await new Promise((resolve) => setTimeout(resolve, client.pollingInterval));
        }
    }
};
exports.InteropBroadcasterService = InteropBroadcasterService;
exports.InteropBroadcasterService = InteropBroadcasterService = InteropBroadcasterService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [client_1.ClientService,
        transaction_watch_1.TransactionWatchService])
], InteropBroadcasterService);
//# sourceMappingURL=interop-broadcaster.service.js.map