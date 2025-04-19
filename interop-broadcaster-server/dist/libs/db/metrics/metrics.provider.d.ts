import type { Provider } from "@nestjs/common";
export declare const DB_CONNECTION_POOL_SIZE_METRIC_NAME = "db_connection_pool_size";
export type DbConnectionPoolSizeMetricLabels = "pool" | "type";
export declare const DB_COMMIT_DURATION_METRIC_NAME = "db_commit_duration_seconds";
export declare const metricProviders: Provider<any>[];
