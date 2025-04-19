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
var TransactionWatchService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionWatchService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const observable_1 = require("../../../../libs/common/src/utils/observable");
const client_1 = require("../client");
let TransactionWatchService = TransactionWatchService_1 = class TransactionWatchService {
    constructor(configService, clientService) {
        const watchChainId = configService.get("watchChainId");
        if (!watchChainId)
            throw new Error("watchChainId is not set");
        this.client = clientService.getClient({ chainId: watchChainId });
        this.logger = new common_1.Logger(TransactionWatchService_1.name);
        this.transactionReceiptObserver = new observable_1.Observable();
    }
    startWatch() {
        let lastProcessedBlock = undefined;
        this.client.watchBlockNumber({
            onBlockNumber: async (latestBlockNumber) => {
                try {
                    if (lastProcessedBlock === undefined) {
                        lastProcessedBlock = latestBlockNumber;
                        return;
                    }
                    for (let blockNumber = lastProcessedBlock + BigInt(1); blockNumber <= latestBlockNumber; blockNumber++) {
                        const block = await this.client.getBlock({ blockNumber });
                        this.logger.debug(`Processing block: ${block.number}`);
                        block.transactions.forEach(this.onNewTransaction.bind(this));
                        lastProcessedBlock = blockNumber;
                    }
                }
                catch (error) {
                    this.logger.error(`Error while processing blocks: ${error}`);
                }
            },
        });
    }
    async onNewTransaction(hash) {
        try {
            const receipt = await this.getTransactionReceipt(hash);
            this.transactionReceiptObserver.notify({ receipt, chainId: this.client.chain.id });
        }
        catch (error) {
            this.logger.error(`Failed to get transaction receipt for hash ${hash}: ${error}`);
        }
    }
    subscribeToTransactionReceipt(callback) {
        return this.transactionReceiptObserver.subscribe(callback);
    }
    async getTransactionReceipt(hash) {
        return await this.client.getTransactionReceipt({ hash });
    }
};
exports.TransactionWatchService = TransactionWatchService;
exports.TransactionWatchService = TransactionWatchService = TransactionWatchService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService, client_1.ClientService])
], TransactionWatchService);
//# sourceMappingURL=transaction-watch.service.js.map