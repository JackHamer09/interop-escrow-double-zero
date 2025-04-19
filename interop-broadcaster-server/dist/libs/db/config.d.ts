declare const _default: {
    db: {
        user: string;
        password: string;
        host: string;
        port: number;
        name: string;
        url: string;
        additional: {
            poolSize: number;
            idleTimeoutMillis: number;
            statement_timeout: number;
        };
    };
    metrics: {
        port: number;
        collectDbConnectionPoolMetricsInterval: number;
    };
};
export default _default;
