import { Module, } from "@nestjs/common";

import { metricProviders, } from "../metrics";
import { UnitOfWork, } from "./unitOfWork.provider";

@Module({
  providers: [ ...metricProviders, UnitOfWork, ],
  exports: [UnitOfWork,],
},)
export class UnitOfWorkModule {}
