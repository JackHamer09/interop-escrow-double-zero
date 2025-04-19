import { Histogram } from "prom-client";
import { DataSource, EntityManager } from "typeorm";
export declare type IsolationLevel = "READ UNCOMMITTED" | "READ COMMITTED" | "REPEATABLE READ" | "SERIALIZABLE";
export interface IDbTransaction<T> {
    waitForExecution: () => Promise<T>;
    commit: () => Promise<void>;
    ensureRollbackIfNotCommitted: () => Promise<void>;
}
export declare class UnitOfWork {
    private readonly dbCommitDurationMetric;
    private readonly dataSource;
    private readonly entityManager;
    private readonly logger;
    private readonly asyncLocalStorage;
    constructor(dbCommitDurationMetric: Histogram, dataSource: DataSource, entityManager: EntityManager);
    getTransactionManager(): EntityManager;
    useTransaction<T>(action: () => Promise<T>, preventAutomaticCommit?: boolean, logContext?: Record<string, string | number>, isolationLevel?: IsolationLevel): IDbTransaction<T>;
}
