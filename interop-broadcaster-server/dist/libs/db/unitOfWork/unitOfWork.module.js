"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnitOfWorkModule = void 0;
const common_1 = require("@nestjs/common");
const metrics_1 = require("../metrics");
const unitOfWork_provider_1 = require("./unitOfWork.provider");
let UnitOfWorkModule = class UnitOfWorkModule {
};
exports.UnitOfWorkModule = UnitOfWorkModule;
exports.UnitOfWorkModule = UnitOfWorkModule = __decorate([
    (0, common_1.Module)({
        providers: [...metrics_1.metricProviders, unitOfWork_provider_1.UnitOfWork,],
        exports: [unitOfWork_provider_1.UnitOfWork,],
    })
], UnitOfWorkModule);
//# sourceMappingURL=unitOfWork.module.js.map