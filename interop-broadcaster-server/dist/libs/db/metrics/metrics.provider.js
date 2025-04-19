"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricProviders = exports.DB_COMMIT_DURATION_METRIC_NAME = exports.DB_CONNECTION_POOL_SIZE_METRIC_NAME = void 0;
const nestjs_prometheus_1 = require("@willsoto/nestjs-prometheus");
exports.DB_CONNECTION_POOL_SIZE_METRIC_NAME = "db_connection_pool_size";
exports.DB_COMMIT_DURATION_METRIC_NAME = "db_commit_duration_seconds";
exports.metricProviders = [
    (0, nestjs_prometheus_1.makeGaugeProvider)({
        name: exports.DB_CONNECTION_POOL_SIZE_METRIC_NAME,
        help: "DB connection pool size.",
        labelNames: ["pool", "type",],
    }),
    (0, nestjs_prometheus_1.makeHistogramProvider)({
        name: exports.DB_COMMIT_DURATION_METRIC_NAME,
        help: "DB commit duration in seconds.",
    }),
];
//# sourceMappingURL=metrics.provider.js.map