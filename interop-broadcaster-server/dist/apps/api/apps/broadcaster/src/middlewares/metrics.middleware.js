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
exports.MetricsMiddleware = void 0;
const common_1 = require("@nestjs/common");
const nestjs_prometheus_1 = require("@willsoto/nestjs-prometheus");
const prom_client_1 = require("prom-client");
const metrics_1 = require("../metrics");
let MetricsMiddleware = class MetricsMiddleware {
    constructor(requestDurationMetric) {
        this.requestDurationMetric = requestDurationMetric;
    }
    use(request, response, next) {
        const stopDurationMeasuring = this.requestDurationMetric.startTimer();
        response.once("finish", () => {
            var _a;
            stopDurationMeasuring({
                method: request.method,
                path: (_a = request.route) === null || _a === void 0 ? void 0 : _a.path,
                statusCode: response.statusCode,
            });
        });
        next();
    }
};
exports.MetricsMiddleware = MetricsMiddleware;
exports.MetricsMiddleware = MetricsMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, nestjs_prometheus_1.InjectMetric)(metrics_1.REQUEST_DURATION_METRIC_NAME)),
    __metadata("design:paramtypes", [prom_client_1.Histogram])
], MetricsMiddleware);
//# sourceMappingURL=metrics.middleware.js.map