import type { Provider, } from "@nestjs/common";
import { makeGaugeProvider,makeHistogramProvider, } from "@willsoto/nestjs-prometheus";

export const DB_CONNECTION_POOL_SIZE_METRIC_NAME = "db_connection_pool_size";
export type DbConnectionPoolSizeMetricLabels = "pool" | "type";

export const DB_COMMIT_DURATION_METRIC_NAME = "db_commit_duration_seconds";

export const metricProviders: Provider<any>[] = [
  makeGaugeProvider({
    name: DB_CONNECTION_POOL_SIZE_METRIC_NAME,
    help: "DB connection pool size.",
    labelNames: [ "pool", "type", ],
  },),
  makeHistogramProvider({
    name: DB_COMMIT_DURATION_METRIC_NAME,
    help: "DB commit duration in seconds.",
  },),
];
