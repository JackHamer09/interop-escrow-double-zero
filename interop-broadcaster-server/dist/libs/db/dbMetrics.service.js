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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DbMetricsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nestjs_prometheus_1 = require("@willsoto/nestjs-prometheus");
const prom_client_1 = require("prom-client");
const typeorm_1 = require("typeorm");
const metrics_1 = require("./metrics");
let DbMetricsService = class DbMetricsService {
    constructor(dbConnectionPoolSizeMetric, dataSource, configService) {
        this.dbConnectionPoolSizeMetric = dbConnectionPoolSizeMetric;
        this.dataSource = dataSource;
        this.collectDbConnectionPoolMetricsTimer = null;
        this.collectDbConnectionPoolMetricsInterval = configService.get("metrics.collectDbConnectionPoolMetricsInterval");
    }
    onModuleInit() {
        this.collectDbConnectionPoolMetricsTimer = setInterval(() => {
            const { master, } = this.dataSource.driver;
            if (!master)
                return;
            this.dbConnectionPoolSizeMetric.labels({
                pool: "master",
                type: "total",
            }).set(master.totalCount);
            this.dbConnectionPoolSizeMetric.labels({
                pool: "master",
                type: "idle",
            }).set(master.idleCount);
            this.dbConnectionPoolSizeMetric.labels({
                pool: "master",
                type: "waiting",
            }).set(master.waitingCount);
        }, this.collectDbConnectionPoolMetricsInterval);
    }
    onModuleDestroy() {
        clearInterval(this.collectDbConnectionPoolMetricsTimer);
    }
};
exports.DbMetricsService = DbMetricsService;
exports.DbMetricsService = DbMetricsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, nestjs_prometheus_1.InjectMetric)(metrics_1.DB_CONNECTION_POOL_SIZE_METRIC_NAME)),
    __metadata("design:paramtypes", [prom_client_1.Gauge,
        typeorm_1.DataSource,
        config_1.ConfigService])
], DbMetricsService);
//# sourceMappingURL=dbMetrics.service.js.map