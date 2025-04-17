import { Controller, Get, Query } from "@nestjs/common";

import { InteropBroadcasterService } from "./interop-broadcaster.service";
import type { Hash } from "viem";

@Controller("interop-transaction-status")
export class InteropTransactionStatusController {
  constructor(private interopBroadcasterService: InteropBroadcasterService) {}

  @Get()
  async requestStatus(@Query() query: { transactionHash: Hash; senderChainId: string }) {
    return await this.interopBroadcasterService.getInteropTransactionStatus(
      Number(query.senderChainId),
      query.transactionHash,
    );
  }
}
