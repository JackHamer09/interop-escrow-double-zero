import type { LoggerService, } from "@nestjs/common";
import { utilities, WinstonModule, } from "nest-winston";
import type { Logform, } from "winston";
import { format,transports, } from "winston";

export const getLogger = (environment: string, logLevel: string,): LoggerService => {
  let defaultLogLevel = "debug";
  const loggerFormatters: Logform.Format[] = [
    environment === "production"
      ? format.timestamp()
      : format.timestamp({ format: "DD/MM/YYYY HH:mm:ss.SSS", },),
    format.ms(),
    utilities.format.nestLike("API", {},),
  ];

  if (environment === "production") {
    defaultLogLevel = "info";
    loggerFormatters.push(format.json(),);
  }

  return WinstonModule.createLogger({
    level: logLevel || defaultLogLevel,
    transports: [new transports.Console({ format: format.combine(...loggerFormatters,), },),],
  },);
};
