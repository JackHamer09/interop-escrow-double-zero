import { type Hash, type TransactionReceipt } from "viem";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SupportedChainId } from "@app/common/chains";
import { Observable } from "@app/common/utils/observable";

import { ClientService } from "../client";

type TransactionReceiptObserverData = { chainId: SupportedChainId; receipt: TransactionReceipt};

@Injectable()
export class TransactionWatchService {
  private readonly logger: Logger;
  private readonly client: any;
  private readonly transactionReceiptObserver: Observable<TransactionReceiptObserverData>;

  constructor(configService: ConfigService, clientService: ClientService) {
    const watchChainId = configService.get<SupportedChainId | undefined>("watchChainId");
    if (!watchChainId) throw new Error("watchChainId is not set");
    this.client = clientService.getClient({ chainId: watchChainId });

    this.logger = new Logger(TransactionWatchService.name);
    this.transactionReceiptObserver = new Observable<TransactionReceiptObserverData>();
  }

  public startWatch() {
    let lastProcessedBlock: bigint | undefined = undefined;
  
    this.client.watchBlockNumber({
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
            const block = await this.client.getBlock({ blockNumber });
            this.logger.debug(`Processing block: ${block.number}`);
  
            block.transactions.forEach(this.onNewTransaction.bind(this));
  
            lastProcessedBlock = blockNumber;
          }
        } catch (error) {
          this.logger.error(`Error while processing blocks: ${error}`);
        }
      },
    });

    // this.onNewTransaction("0xd8a6a0bfbd30feed4fdb029371802e9e662f41ffc0d14e1cad361bb3a74e89c7");
  }

  private async onNewTransaction(hash: Hash) {
    try {
      const receipt = await this.getTransactionReceipt(hash);
      this.transactionReceiptObserver.notify({ receipt, chainId: this.client.chain.id });
    } catch (error) {
      this.logger.error(`Failed to get transaction receipt for hash ${hash}: ${error}`);
    }
  }
  
  public subscribeToTransactionReceipt(callback: (receipt: TransactionReceiptObserverData) => void) {
    return this.transactionReceiptObserver.subscribe(callback);
  }

  private async getTransactionReceipt(hash: Hash): Promise<TransactionReceipt> {
    return await this.client.getTransactionReceipt({ hash });
  }
}
