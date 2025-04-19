import { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Gauge } from "prom-client";
import { DataSource, Driver } from "typeorm";
import { DbConnectionPoolSizeMetricLabels } from "./metrics";
type ConnectionPoolInfo = {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
};
export type PostgresDriver = Driver & {
    master: ConnectionPoolInfo;
};
export declare class DbMetricsService implements OnModuleInit, OnModuleDestroy {
    private readonly dbConnectionPoolSizeMetric;
    private readonly dataSource;
    private collectDbConnectionPoolMetricsInterval;
    private collectDbConnectionPoolMetricsTimer;
    constructor(dbConnectionPoolSizeMetric: Gauge<DbConnectionPoolSizeMetricLabels>, dataSource: DataSource, configService: ConfigService);
    onModuleInit(): void;
    onModuleDestroy(): void;
}
export {};
