"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricProviders = exports.REQUEST_DURATION_METRIC_NAME = void 0;
const nestjs_prometheus_1 = require("@willsoto/nestjs-prometheus");
exports.REQUEST_DURATION_METRIC_NAME = "request_duration_seconds";
exports.metricProviders = [
    (0, nestjs_prometheus_1.makeHistogramProvider)({
        name: exports.REQUEST_DURATION_METRIC_NAME,
        help: "HTTP request processing duration in seconds.",
        labelNames: [
            "method",
            "path",
            "statusCode",
        ],
    }),
];
//# sourceMappingURL=metrics.provider.js.map