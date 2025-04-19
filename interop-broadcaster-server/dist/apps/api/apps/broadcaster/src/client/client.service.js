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
var ClientService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientService = void 0;
const chains_1 = require("../../../../libs/common/src/chains");
const common_1 = require("@nestjs/common");
const viem_1 = require("viem");
let ClientService = ClientService_1 = class ClientService {
    constructor() {
        this.chainClientByChainId = new Map();
        this.logger = new common_1.Logger(ClientService_1.name);
    }
    getClient({ chainId }) {
        const chain = chains_1.supportedChains.find((chain) => chain.id === chainId);
        if (!chain)
            throw new Error(`Chain with id ${chainId} not found`);
        if (this.chainClientByChainId.has(chainId)) {
            return this.chainClientByChainId.get(chainId);
        }
        const client = (0, viem_1.createPublicClient)({
            chain,
            transport: (0, viem_1.http)(),
            pollingInterval: 500,
        });
        this.chainClientByChainId.set(chainId, client);
        return client;
    }
};
exports.ClientService = ClientService;
exports.ClientService = ClientService = ClientService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], ClientService);
//# sourceMappingURL=client.service.js.map