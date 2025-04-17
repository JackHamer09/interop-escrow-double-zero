import type { TypeOrmModuleOptions, } from "@nestjs/typeorm";
import type { DataSourceOptions, } from "typeorm";
import { DataSource, } from "typeorm";

import config from "./config";
// import * as Entities from "./entities";

const dataSourceOptions: DataSourceOptions = {
  type: "postgres",
  host: config.db.host || "localhost",
  port: config.db.port || 5432,
  username: config.db.user || "postgres",
  password: config.db.password || "postgres",
  database: config.db.name || "easy-onramp",
  poolSize: config.db.additional.poolSize || 300,
  extra: {
    idleTimeoutMillis: config.db.additional.idleTimeoutMillis || 12_000,
    statement_timeout: config.db.additional.statement_timeout || 20_000,
  },
  applicationName: "api",
  migrationsRun: false,
  synchronize: false,
  logging: false,
  // entities: Object.values(Entities,),
  migrations: ["dist/libs/db/migrations/*.js",],
  subscribers: [],
};
export const typeOrmModuleOptions: TypeOrmModuleOptions = {
  ...dataSourceOptions,
  autoLoadEntities: true,
  retryDelay: 3000, // to cover 3 minute DB failover window
  retryAttempts: 70, // try to reconnect for 3.5 minutes,
};

const typeOrmCliDataSource = new DataSource(dataSourceOptions,);
export default typeOrmCliDataSource;
