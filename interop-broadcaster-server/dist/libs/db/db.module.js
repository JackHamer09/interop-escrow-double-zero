"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DbModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const config_2 = require("./config");
const dbMetrics_service_1 = require("./dbMetrics.service");
const metrics_provider_1 = require("./metrics/metrics.provider");
const typeorm_config_1 = require("./typeorm.config");
const unitOfWork_1 = require("./unitOfWork");
let DbModule = class DbModule {
};
exports.DbModule = DbModule;
exports.DbModule = DbModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [() => config_2.default,],
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule,],
                useFactory: async () => (Object.assign({}, typeorm_config_1.typeOrmModuleOptions)),
            }),
            unitOfWork_1.UnitOfWorkModule,
        ],
        providers: [
            common_1.Logger,
            dbMetrics_service_1.DbMetricsService,
            ...metrics_provider_1.metricProviders,
        ],
        exports: [
            typeorm_1.TypeOrmModule,
        ],
    })
], DbModule);
//# sourceMappingURL=db.module.js.map