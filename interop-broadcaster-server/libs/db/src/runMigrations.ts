import type { LoggerService, } from "@nestjs/common";

import typeOrmCliDataSource from "./typeorm.config";

export async function runMigrations(logger: LoggerService,) {
  logger.log("Running migrations...",);
  await typeOrmCliDataSource.initialize();
  await typeOrmCliDataSource.runMigrations();
  logger.log("Migrations completed.",);
}