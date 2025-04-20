import { type Hash, type TransactionReceipt } from "viem";
import { Injectable, Logger } from "@nestjs/common";
import { SupportedChainId, supportedChains } from "@app/common/chains";
import { Observable } from "@app/common/utils/observable";

import { ClientService } from "../client";

type TransactionReceiptObserverData = { chainId: SupportedChainId; receipt: TransactionReceipt };

@Injectable()
export class TransactionWatchService {
  private readonly logger = new Logger(TransactionWatchService.name);
  private readonly transactionReceiptObserver = new Observable<TransactionReceiptObserverData>();

  constructor(private readonly clientService: ClientService) {}

  public startWatch() {
    for (const chain of supportedChains) {
      const client = this.clientService.getClient({ chainId: chain.id });
      let lastProcessedBlock: bigint | undefined;

      client.watchBlockNumber({
        onBlockNumber: async (latestBlockNumber: bigint) => {
          try {
            if (lastProcessedBlock === undefined) {
              lastProcessedBlock = latestBlockNumber;
              return;
            }

            for (
              let blockNumber = lastProcessedBlock + BigInt(1);
              blockNumber <= latestBlockNumber;
              blockNumber++
            ) {
              const block = await client.getBlock({ blockNumber });
              this.logger.debug(`[${chain.name}] Processing block ${block.number}`);

              for (const tx of block.transactions) {
                this.handleTransaction(tx, chain.id);
              }

              lastProcessedBlock = blockNumber;
            }
          } catch (error) {
            this.logger.error(`Error processing blocks on chain ${chain.id}: ${error}`);
          }
        },
      });
    }
  }

  private async handleTransaction(hash: Hash, chainId: SupportedChainId) {
    try {
      const client = this.clientService.getClient({ chainId });
      const receipt = await client.getTransactionReceipt({ hash });
      this.transactionReceiptObserver.notify({ receipt, chainId });
    } catch (error) {
      this.logger.error(`Failed to get receipt for ${hash} on chain ${chainId}: ${error}`);
    }
  }

  public subscribeToTransactionReceipt(callback: (data: TransactionReceiptObserverData) => void) {
    return this.transactionReceiptObserver.subscribe(callback);
  }
}