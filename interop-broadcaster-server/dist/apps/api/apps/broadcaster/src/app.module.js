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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const terminus_1 = require("@nestjs/terminus");
const config_2 = require("./config");
const health_1 = require("./health");
const metrics_provider_1 = require("./metrics/metrics.provider");
const metrics_middleware_1 = require("./middlewares/metrics.middleware");
const client_1 = require("./client");
const transaction_watch_1 = require("./transaction-watch");
const interop_broadcaster_1 = require("./interop-broadcaster");
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(metrics_middleware_1.MetricsMiddleware).forRoutes("*");
    }
    constructor(transactionWatchService) {
        this.transactionWatchService = transactionWatchService;
    }
    onModuleInit() {
        this.transactionWatchService.startWatch();
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [() => config_2.default,],
            }),
            terminus_1.TerminusModule,
        ],
        providers: [
            common_1.Logger,
            ...metrics_provider_1.metricProviders,
            client_1.ClientService,
            transaction_watch_1.TransactionWatchService,
            interop_broadcaster_1.InteropBroadcasterService,
        ],
        controllers: [
            health_1.HealthController,
            interop_broadcaster_1.InteropTransactionStatusController,
        ],
    }),
    __metadata("design:paramtypes", [transaction_watch_1.TransactionWatchService])
], AppModule);
//# sourceMappingURL=app.module.js.map