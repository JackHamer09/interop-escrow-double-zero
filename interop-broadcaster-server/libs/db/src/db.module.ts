import { Logger,Module, } from "@nestjs/common";
import { ConfigModule, } from "@nestjs/config";
import { TypeOrmModule, } from "@nestjs/typeorm";

import config from "./config";
import { DbMetricsService, } from "./dbMetrics.service";
// import * as Entities from "./entities";
import { metricProviders, } from "./metrics/metrics.provider";
// import * as Repositories from "./repositories";
import { typeOrmModuleOptions, } from "./typeorm.config";
import { UnitOfWorkModule, } from "./unitOfWork";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [() => config,], 
    },),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule,],
      useFactory: async () => ({ ...typeOrmModuleOptions, }),
    },),
    // TypeOrmModule.forFeature(Object.values(Entities,),),
    UnitOfWorkModule,
  ],
  providers: [
    Logger,
    DbMetricsService,
    ...metricProviders,
    // ...Object.values(Repositories,),
  ],
  exports: [
    TypeOrmModule,
    // ...Object.values(Repositories,),
  ],
},)
export class DbModule {}
