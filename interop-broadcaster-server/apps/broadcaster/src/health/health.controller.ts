import { setTimeout, } from "node:timers/promises";

import {
  BeforeApplicationShutdown,Controller, Get, Logger, 
} from "@nestjs/common";
import { ConfigService, } from "@nestjs/config";
import {
  HealthCheck, HealthCheckResult,HealthCheckService, TypeOrmHealthIndicator, 
} from "@nestjs/terminus";

@Controller([ "health", "ready", ],)
export class HealthController implements BeforeApplicationShutdown {
  private readonly logger: Logger;
  private readonly gracefulShutdownTimeoutMs: number;
  private readonly releaseVersion: string;

  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly dbHealthChecker: TypeOrmHealthIndicator,
    configService: ConfigService,
  ) {
    this.logger = new Logger(HealthController.name,);
    this.gracefulShutdownTimeoutMs = configService.get<number>("gracefulShutdownTimeoutMs",);
    this.releaseVersion = configService.get<string | null>("release.version",);
  }

  @Get()
  @HealthCheck()
  public async check(): Promise<{
    version: string | null;
    database: HealthCheckResult;
  }> {
    return {
      version: this.releaseVersion,
      database: await this.healthCheckService.check([() => this.dbHealthChecker.pingCheck("database",),],),
    };
  }

  public async beforeApplicationShutdown(signal?: string,): Promise<void> {
    if (this.gracefulShutdownTimeoutMs && signal === "SIGTERM") {
      this.logger.debug(`Awaiting ${this.gracefulShutdownTimeoutMs}ms before shutdown`,);
      await setTimeout(this.gracefulShutdownTimeoutMs,);
      this.logger.debug("Timeout reached, shutting down now",);
    }
  }
}
