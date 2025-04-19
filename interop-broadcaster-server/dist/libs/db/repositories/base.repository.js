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
exports.BaseRepository = void 0;
const common_1 = require("@nestjs/common");
const unitOfWork_1 = require("../unitOfWork");
const BATCH_SIZE = 1000;
let BaseRepository = class BaseRepository {
    constructor(entityTarget, unitOfWork) {
        this.entityTarget = entityTarget;
        this.unitOfWork = unitOfWork;
        this.createQueryBuilder = (alias) => {
            const transactionManager = this.unitOfWork.getTransactionManager();
            return transactionManager.createQueryBuilder(this.entityTarget, alias);
        };
        this.getTransactionManager = () => {
            return this.unitOfWork.getTransactionManager();
        };
    }
    async addMany(records) {
        if (!(records === null || records === void 0 ? void 0 : records.length)) {
            return;
        }
        const transactionManager = this.unitOfWork.getTransactionManager();
        let recordsToAdd = [];
        for (let i = 0; i < records.length; i++) {
            recordsToAdd.push(records[i]);
            if (recordsToAdd.length === BATCH_SIZE || i === records.length - 1) {
                await transactionManager.insert(this.entityTarget, recordsToAdd);
                recordsToAdd = [];
            }
        }
    }
    add(record) {
        const transactionManager = this.unitOfWork.getTransactionManager();
        return transactionManager.insert(this.entityTarget, record);
    }
    async update(id, partialEntity) {
        const transactionManager = this.unitOfWork.getTransactionManager();
        await transactionManager.update(this.entityTarget, { id, }, partialEntity);
    }
    async upsert(record, shouldExcludeNullValues = true) {
        const transactionManager = this.unitOfWork.getTransactionManager();
        const metadata = transactionManager.connection.getMetadata(this.entityTarget);
        const conflictPaths = metadata.indices
            .filter((index) => index.isUnique)
            .flatMap((index) => index.columns.map((column) => column.propertyName));
        if (conflictPaths.length === 0) {
            conflictPaths.push(...metadata.primaryColumns.map((col) => col.propertyName));
        }
        const recordToUpsert = shouldExcludeNullValues
            ? Object.fromEntries(Object.entries(record).filter(([, v,]) => v !== null && v !== undefined))
            : record;
        await transactionManager.upsert(this.entityTarget, recordToUpsert, {
            conflictPaths,
            skipUpdateIfNoValuesChanged: true,
        });
    }
    delete(where) {
        const transactionManager = this.unitOfWork.getTransactionManager();
        return transactionManager.delete(this.entityTarget, where);
    }
    async findOneBy(where) {
        const transactionManager = this.unitOfWork.getTransactionManager();
        return await transactionManager.findOneBy(this.entityTarget, where);
    }
    async findOne(options) {
        const transactionManager = this.unitOfWork.getTransactionManager();
        return await transactionManager.findOne(this.entityTarget, options);
    }
    async find(options) {
        const transactionManager = this.unitOfWork.getTransactionManager();
        return await transactionManager.find(this.entityTarget, options);
    }
    async count(options) {
        const transactionManager = this.unitOfWork.getTransactionManager();
        return await transactionManager.count(this.entityTarget, options);
    }
    async findOrCreate(createEntity, where) {
        var _a;
        const transactionManager = this.unitOfWork.getTransactionManager();
        const searchCriteria = where !== null && where !== void 0 ? where : createEntity;
        let entity = await transactionManager.findOneBy(this.entityTarget, searchCriteria);
        if (!entity) {
            const insertResult = await transactionManager.insert(this.entityTarget, createEntity);
            const id = (_a = insertResult.identifiers[0]) === null || _a === void 0 ? void 0 : _a.id;
            if (id) {
                entity = await transactionManager.findOneBy(this.entityTarget, { id, });
            }
        }
        return entity;
    }
};
exports.BaseRepository = BaseRepository;
exports.BaseRepository = BaseRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Object, unitOfWork_1.UnitOfWork])
], BaseRepository);
//# sourceMappingURL=base.repository.js.map