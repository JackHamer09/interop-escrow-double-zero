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
var HealthController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const promises_1 = require("node:timers/promises");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const terminus_1 = require("@nestjs/terminus");
let HealthController = HealthController_1 = class HealthController {
    constructor(healthCheckService, dbHealthChecker, configService) {
        this.healthCheckService = healthCheckService;
        this.dbHealthChecker = dbHealthChecker;
        this.logger = new common_1.Logger(HealthController_1.name);
        this.gracefulShutdownTimeoutMs = configService.get("gracefulShutdownTimeoutMs");
        this.releaseVersion = configService.get("release.version");
    }
    async check() {
        return {
            version: this.releaseVersion,
            database: await this.healthCheckService.check([() => this.dbHealthChecker.pingCheck("database"),]),
        };
    }
    async beforeApplicationShutdown(signal) {
        if (this.gracefulShutdownTimeoutMs && signal === "SIGTERM") {
            this.logger.debug(`Awaiting ${this.gracefulShutdownTimeoutMs}ms before shutdown`);
            await (0, promises_1.setTimeout)(this.gracefulShutdownTimeoutMs);
            this.logger.debug("Timeout reached, shutting down now");
        }
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)(),
    (0, terminus_1.HealthCheck)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "check", null);
exports.HealthController = HealthController = HealthController_1 = __decorate([
    (0, common_1.Controller)(["health", "ready",]),
    __metadata("design:paramtypes", [terminus_1.HealthCheckService,
        terminus_1.TypeOrmHealthIndicator,
        config_1.ConfigService])
], HealthController);
//# sourceMappingURL=health.controller.js.map