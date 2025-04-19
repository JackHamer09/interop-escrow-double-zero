"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const { NODE_ENV, RELEASE_VERSION, PORT, METRICS_PORT, GRACEFUL_SHUTDOWN_TIMEOUT_MS, WATCH_CHAIN_ID, } = process.env;
exports.default = {
    NODE_ENV,
    release: { version: RELEASE_VERSION || null },
    port: parseInt(PORT, 10) || 3020,
    metrics: { port: parseInt(METRICS_PORT, 10) || 3005 },
    gracefulShutdownTimeoutMs: parseInt(GRACEFUL_SHUTDOWN_TIMEOUT_MS, 10) || 0,
    watchChainId: WATCH_CHAIN_ID ? parseInt(WATCH_CHAIN_ID, 10) : undefined,
};
//# sourceMappingURL=config.js.map