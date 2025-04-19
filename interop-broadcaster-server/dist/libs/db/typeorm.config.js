"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeOrmModuleOptions = void 0;
const typeorm_1 = require("typeorm");
const config_1 = require("./config");
const dataSourceOptions = {
    type: "postgres",
    host: config_1.default.db.host || "localhost",
    port: config_1.default.db.port || 5432,
    username: config_1.default.db.user || "postgres",
    password: config_1.default.db.password || "postgres",
    database: config_1.default.db.name || "easy-onramp",
    poolSize: config_1.default.db.additional.poolSize || 300,
    extra: {
        idleTimeoutMillis: config_1.default.db.additional.idleTimeoutMillis || 12000,
        statement_timeout: config_1.default.db.additional.statement_timeout || 20000,
    },
    applicationName: "api",
    migrationsRun: false,
    synchronize: false,
    logging: false,
    migrations: ["dist/libs/db/migrations/*.js",],
    subscribers: [],
};
exports.typeOrmModuleOptions = Object.assign(Object.assign({}, dataSourceOptions), { autoLoadEntities: true, retryDelay: 3000, retryAttempts: 70 });
const typeOrmCliDataSource = new typeorm_1.DataSource(dataSourceOptions);
exports.default = typeOrmCliDataSource;
//# sourceMappingURL=typeorm.config.js.map