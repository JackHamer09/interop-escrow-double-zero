import { getLogger, } from "@app/logger";
import { ValidationPipe, } from "@nestjs/common";
import { ConfigService, } from "@nestjs/config";
import { NestFactory, } from "@nestjs/core";
import helmet from "helmet";

import { AppModule, } from "./app.module";
import { MetricsModule, } from "./metrics/metrics.module";

declare global {
  interface BigInt {
    toJSON(): String;
  }
}
BigInt.prototype.toJSON = function () { return String(this) }

async function bootstrap() {
  const logger = getLogger(process.env.NODE_ENV, process.env.LOG_LEVEL,);

  process.on("uncaughtException", function (error,) {
    logger.error(error.message, error.stack, "UnhandledExceptions",);
    process.exit(1,);
  },);

  const app = await NestFactory.create(AppModule, { logger, },);
  const configService = app.get(ConfigService,);
  const metricsApp = await NestFactory.create(MetricsModule,);
  metricsApp.enableShutdownHooks();

  app.enableCors({
    origin: "*",
    methods: "GET,PATCH,POST,DELETE",
    preflightContinue: false,
    optionsSuccessStatus: 204,
  },);
  app.setGlobalPrefix("api",);
  app.use(helmet(),);
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      disableErrorMessages: process.env.DISABLE_ERROR_MESSAGES === "true",
      transform: true,
      whitelist: true,
    },),
  );

  await app.listen(configService.get<number>("port",),);
  await metricsApp.listen(configService.get<number>("metrics.port",),);
}
bootstrap();
