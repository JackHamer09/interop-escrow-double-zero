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
var UnitOfWork_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnitOfWork = void 0;
const node_async_hooks_1 = require("node:async_hooks");
const common_1 = require("@nestjs/common");
const nestjs_prometheus_1 = require("@willsoto/nestjs-prometheus");
const prom_client_1 = require("prom-client");
const typeorm_1 = require("typeorm");
const metrics_1 = require("../metrics");
let UnitOfWork = UnitOfWork_1 = class UnitOfWork {
    constructor(dbCommitDurationMetric, dataSource, entityManager) {
        this.dbCommitDurationMetric = dbCommitDurationMetric;
        this.dataSource = dataSource;
        this.entityManager = entityManager;
        this.logger = new common_1.Logger(UnitOfWork_1.name);
        this.asyncLocalStorage = new node_async_hooks_1.AsyncLocalStorage();
    }
    getTransactionManager() {
        const store = this.asyncLocalStorage.getStore();
        const queryRunner = store === null || store === void 0 ? void 0 : store.queryRunner;
        return (queryRunner === null || queryRunner === void 0 ? void 0 : queryRunner.manager) || this.entityManager;
    }
    useTransaction(action, preventAutomaticCommit = false, logContext, isolationLevel) {
        const queryRunner = this.dataSource.createQueryRunner();
        let isReleased = false;
        const release = async () => {
            this.logger.debug(Object.assign({ message: "Releasing the unit of work" }, logContext));
            await queryRunner.release();
        };
        const commit = async () => {
            if (isReleased) {
                throw new Error("The transaction cannot be committed as it connection is released");
            }
            isReleased = true;
            try {
                this.logger.debug(Object.assign({ message: "Committing the transaction" }, logContext));
                const stopDbCommitDurationMeasuring = this.dbCommitDurationMetric.startTimer();
                await queryRunner.commitTransaction();
                stopDbCommitDurationMeasuring();
            }
            catch (error) {
                this.logger.error(Object.assign({ message: "Error while committing the transaction. Rolling back" }, logContext), error.stack);
                await queryRunner.rollbackTransaction();
                throw error;
            }
            finally {
                await release();
            }
        };
        const rollback = async () => {
            if (isReleased) {
                return;
            }
            isReleased = true;
            try {
                await queryRunner.rollbackTransaction();
            }
            finally {
                await release();
            }
        };
        const executionPromise = this.asyncLocalStorage.run({ queryRunner, }, async () => {
            await queryRunner.connect();
            await queryRunner.startTransaction(isolationLevel);
            let executionResult = null;
            try {
                executionResult = await action();
            }
            catch (error) {
                this.logger.error(Object.assign({ message: "Error while processing the transaction. Rolling back" }, logContext), error.stack);
                await rollback();
                throw error;
            }
            if (!preventAutomaticCommit) {
                await commit();
            }
            return executionResult;
        });
        return {
            waitForExecution: () => executionPromise,
            commit,
            ensureRollbackIfNotCommitted: rollback,
        };
    }
};
exports.UnitOfWork = UnitOfWork;
exports.UnitOfWork = UnitOfWork = UnitOfWork_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, nestjs_prometheus_1.InjectMetric)(metrics_1.DB_COMMIT_DURATION_METRIC_NAME)),
    __metadata("design:paramtypes", [prom_client_1.Histogram,
        typeorm_1.DataSource,
        typeorm_1.EntityManager])
], UnitOfWork);
//# sourceMappingURL=unitOfWork.provider.js.map