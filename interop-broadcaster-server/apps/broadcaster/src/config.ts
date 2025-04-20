import { config, } from "dotenv";
config();

const {
  NODE_ENV,
  RELEASE_VERSION,
  PORT,
  METRICS_PORT,
  GRACEFUL_SHUTDOWN_TIMEOUT_MS,
} = process.env;

export default {
  NODE_ENV,
  release: { version: RELEASE_VERSION || null },
  port: parseInt(PORT, 10) || 3030,
  metrics: { port: parseInt(METRICS_PORT, 10) || 3005 },
  gracefulShutdownTimeoutMs: parseInt(GRACEFUL_SHUTDOWN_TIMEOUT_MS, 10) || 0,
};
