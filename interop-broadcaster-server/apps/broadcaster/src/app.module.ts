import { Logger, MiddlewareConsumer, Module, NestModule, OnModuleInit } from "@nestjs/common";
import { ConfigModule, } from "@nestjs/config";
import { TerminusModule, } from "@nestjs/terminus";

// import { DbModule, } from "@app/db";

import config from "./config";
import { HealthController, } from "./health";
import { metricProviders, } from "./metrics/metrics.provider";
import { MetricsMiddleware, } from "./middlewares/metrics.middleware";
import { ClientService } from "./client";
import { TransactionWatchService } from "./transaction-watch";
import { InteropBroadcasterService, InteropTransactionStatusController } from "./interop-broadcaster";
import { MintTestFundsService, MintTestFundsController } from "./mint-test-funds";
import { json } from "express";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [() => config,],
    },),
    TerminusModule,

    // DbModule,
  ],
  providers: [
    Logger,
    ...metricProviders,

    ClientService,
    TransactionWatchService,
    InteropBroadcasterService,
    MintTestFundsService,
  ],
  controllers: [
    HealthController,
    InteropTransactionStatusController,
    MintTestFundsController,
  ],
},)
export class AppModule implements NestModule, OnModuleInit {
  configure(consumer: MiddlewareConsumer,) {
    // Apply JSON body parser middleware for all routes with a larger size limit
    consumer
      .apply(json({ limit: '50mb' }), MetricsMiddleware)
      .forRoutes("*");
  }

  constructor(
    private readonly transactionWatchService: TransactionWatchService,
  ) {}

  onModuleInit() {
    this.transactionWatchService.startWatch();
  }
}
