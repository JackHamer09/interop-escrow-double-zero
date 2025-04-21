import { getAddress, Hash, PublicClient, type TransactionReceipt } from "viem";
import * as ethers from "ethers";
import * as zksync from "zksync-ethers-interop-support";
import { Injectable, Logger } from "@nestjs/common";

import { L2_INTEROP_CENTER_ADDRESS, L2_INTEROP_HANDLER_ADDRESS, L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS } from "@app/common/utils/constants";
import { SupportedChainId, supportedChains } from "@app/common/chains";

import { ClientService } from "../client";
import { TransactionWatchService } from "../transaction-watch";
import { getInteropTriggerData, getInteropBundleData } from './temp-sdk';

type InteropTransactionStatus =
  | { status: 'processing'; senderChainId: number; destinationChainId: number | null; transactionHash: Hash; }
  | { status: 'processing_failed'; senderChainId: number; destinationChainId: number | null; transactionHash: Hash; }
  | { status: 'waiting_finalization' | 'broadcasting'; senderChainId: number; destinationChainId: number; transactionHash: Hash; }
  | { status: 'broadcasting_failed'; senderChainId: number; destinationChainId: number; transactionHash: Hash; }
  | { status: 'completed'; senderChainId: number; destinationChainId: number; transactionHash: Hash; broadcastTransactionHash: Hash }
  | { status: 'not_found'; senderChainId: number; destinationChainId: null; transactionHash: Hash; }
type InteropTransactionKey = `${number}-${Hash}`;

@Injectable()
export class InteropBroadcasterService {
  private readonly logger: Logger;
  private readonly transactionStatusMap = new Map<InteropTransactionKey, InteropTransactionStatus>();

  constructor(
    private readonly clientService: ClientService,
    private readonly transactionWatch: TransactionWatchService,
  ) {
    this.logger = new Logger(InteropBroadcasterService.name);
    this.transactionWatch.subscribeToTransactionReceipt(this.onNewTransactionReceipt.bind(this));
  }
  
  private getTransactionKey(chainId: number, transactionHash: Hash): InteropTransactionKey {
    return `${chainId}-${transactionHash}`;
  }

  private async onNewTransactionReceipt({ receipt, chainId }: { receipt: TransactionReceipt; chainId: SupportedChainId }) {
    // if (getAddress(receipt.to) !== getAddress(L2_INTEROP_CENTER_ADDRESS)) return;
    
    const senderChain = supportedChains.find((chain) => chain.id === chainId);
    const transactionKey = this.getTransactionKey(chainId, receipt.transactionHash);
    const senderClient = this.clientService.getClient({ chainId });
    const senderProvider = new zksync.Provider(senderChain.rpcUrls.default.http[0]);
    
    try {
      this.transactionStatusMap.set(transactionKey, {
        status: 'waiting_finalization',
        senderChainId: chainId,
        destinationChainId: null,
        transactionHash: receipt.transactionHash
      });
      await this.waitUntilBlockFinalized(senderClient, receipt.blockNumber);
  
      this.transactionStatusMap.set(transactionKey, {
        status: "processing",
        senderChainId: chainId,
        destinationChainId: null,
        transactionHash: receipt.transactionHash
      });
      const [feeBundle, executionBundle, triggerDataBundle] = await Promise.all([
        getInteropBundleData(senderProvider, receipt.transactionHash, 0),
        getInteropBundleData(senderProvider, receipt.transactionHash, 1),
        getInteropTriggerData(senderProvider, receipt.transactionHash, 2),
      ]);
      if (!triggerDataBundle.output) {
        // Not an interop transaction or broken
        this.transactionStatusMap.delete(transactionKey);
        return;
      }
  
      const destinationChainId = parseInt(triggerDataBundle.output.destinationChainId, 10);
      this.transactionStatusMap.set(transactionKey, {
        status: "processing",
        senderChainId: chainId,
        destinationChainId: destinationChainId,
        transactionHash: receipt.transactionHash
      });
      this.logger.debug(`[${senderChain?.name || chainId}] New interop transaction to chain ${destinationChainId}: ${receipt.transactionHash}`);
      const destinationChain = supportedChains.find((c) => c.id === destinationChainId);
      if (!destinationChain) throw new Error(`Unsupported chainId: ${destinationChainId}`);
  
      const destinationClient = this.clientService.getClient({ chainId: destinationChainId as SupportedChainId });
      const destinationProvider = new zksync.Provider(destinationChain.rpcUrls.default.http[0]);
  
      const transactionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['bytes', 'bytes'],
        [executionBundle.rawData, executionBundle.fullProof]
      );
      const nonce = await destinationClient.getTransactionCount({ address: L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS });
      const feeData = await destinationProvider.getFeeData();
  
      const interopTx = {
        from: L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS,
        to: L2_INTEROP_HANDLER_ADDRESS,
        chainId: destinationChain.id,
        data: transactionData,
        nonce,
        customData: {
          paymasterParams: {
            paymaster: triggerDataBundle.output.gasFields.paymaster,
            paymasterInput: triggerDataBundle.output.gasFields.paymasterInput,
          },
          gasPerPubdata: triggerDataBundle.output.gasFields.gasPerPubdataByteLimit,
          customSignature: ethers.AbiCoder.defaultAbiCoder().encode(
            ['bytes', 'bytes', 'address', 'address', 'bytes'],
            [
              feeBundle.rawData,
              feeBundle.fullProof,
              triggerDataBundle.output.from,
              triggerDataBundle.output.gasFields.refundRecipient,
              triggerDataBundle.fullProof,
            ]
          ),
        },
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        gasLimit: triggerDataBundle.output.gasFields.gasLimit,
        value: 0,
      };
  
      this.transactionStatusMap.set(transactionKey, {
        status: 'broadcasting',
        senderChainId: chainId,
        destinationChainId,
        transactionHash: receipt.transactionHash,
      });
  
      const hexTx = zksync.utils.serializeEip712(interopTx);
      const broadcastTx = await destinationProvider.broadcastTransaction(hexTx);
      this.logger.debug(`[${senderChain.name}] Interop transaction sent to ${destinationChain.name}: ${broadcastTx.hash}`);
      await broadcastTx.wait();
  
      this.transactionStatusMap.set(transactionKey, {
        status: 'completed',
        senderChainId: chainId,
        destinationChainId,
        transactionHash: receipt.transactionHash,
        broadcastTransactionHash: broadcastTx.hash as Hash,
      });
    } catch (err) {
      this.logger.error(`Interop transaction processing failed for chain ${chainId}, transaction: ${receipt.transactionHash}`);
      this.logger.error(err);
      const currentTx: InteropTransactionStatus | undefined = this.transactionStatusMap.get(transactionKey);
      this.transactionStatusMap.set(transactionKey, {
        status: currentTx?.status === "broadcasting" ? "broadcasting_failed" : "processing_failed",
        senderChainId: chainId,
        destinationChainId: currentTx?.destinationChainId,
        transactionHash: receipt.transactionHash,
      });
    }
  }
  
  public async getInteropTransactionStatus(chainId: number, transactionHash: Hash): Promise<InteropTransactionStatus> {
    const key = this.getTransactionKey(chainId, transactionHash);
    
    const POLL_FOR_STATUS = 15_000;
    const start = Date.now();
    while (Date.now() - start < POLL_FOR_STATUS) {
      const found = this.transactionStatusMap.get(key);
      if (found) return found;
      await new Promise((res) => setTimeout(res, 250));
    }
    return { status: 'not_found', senderChainId: chainId, destinationChainId: null, transactionHash };
  }

  private async waitUntilBlockFinalized(
    client: PublicClient,
    blockNumber: bigint,
  ) {
    while (true) {
      const block = await client.getBlock({ blockTag: 'finalized' });
      if (blockNumber <= block.number) break;
      await new Promise((resolve) => setTimeout(resolve, client.pollingInterval));
    }
  }
}
