import { getAddress, Hash, keccak256, parseEventLogs, PublicClient, toBytes, type TransactionReceipt } from "viem";
import * as ethers from "ethers";
import * as zksync from "zksync-ethers";
import { Injectable, Logger } from "@nestjs/common";

import { INTEROP_BUNDLE_ABI, INTEROP_TRIGGER_ABI, L2_INTEROP_CENTER_ADDRESS, L2_INTEROP_HANDLER_ADDRESS, L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS, MESSAGE_INCLUSION_PROOF_ABI } from "@app/common/utils/constants";
import { chain2, SupportedChainId, supportedChains } from "@app/common/chains";

import { ClientService } from "../client";
import { TransactionWatchService } from "../transaction-watch";
import { getInteropTriggerData, getInteropBundleData } from './temp-sdk';
import { FinalizeWithdrawalParams } from "zksync-ethers/build/types";
import { INTEROP_CENTER_ABI } from "@app/common";

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
      const { bundleEvents, triggerEvents } = this.parseTransactionEvents(receipt);
      if (!bundleEvents.length || !triggerEvents.length) {
        this.logger.debug(`Transaction ${receipt.transactionHash} is not an interop transaction.`);
        return;
      }

      const feeBundle = bundleEvents[0];
      const executionBundle = bundleEvents[1];
      const triggerDataBundle = triggerEvents[0];
      const destinationChainId = Number(triggerDataBundle.args._interopTrigger.destinationChainId);
      this.logger.log(`Processing new interop transaction: ${receipt.transactionHash} From ${chainId} - To ${destinationChainId}`);

      this.transactionStatusMap.set(transactionKey, {
        status: 'waiting_finalization',
        senderChainId: chainId,
        destinationChainId: destinationChainId,
        transactionHash: receipt.transactionHash
      });
      // await this.waitUntilBlockFinalized(senderClient, receipt.blockNumber);
  
      this.transactionStatusMap.set(transactionKey, {
        status: "processing",
        senderChainId: chainId,
        destinationChainId: destinationChainId,
        transactionHash: receipt.transactionHash
      });

      const senderUtilityWallet = new zksync.Wallet(zksync.Wallet.createRandom().privateKey, senderProvider);
      // const params = await senderUtilityWallet.getFinalizeWithdrawalParams(receipt.transactionHash, 0, 0, 'gw_message_root');
      // const GW_CHAIN_ID = BigInt(506);
      // await this.waitForLogProof(senderProvider, receipt.transactionHash, 0);
      // await waitForInteropRootNonZero(interop2Provider, interop2RichWallet, GW_CHAIN_ID, getGWBlockNumber(params));
      // console.log("GW Block Number:", this.getGWBlockNumber(params));
      
      
      // console.log("Fetching feeBundle, executionBundle, triggerDataBundle");
      // const [feeBundle, executionBundle, triggerDataBundle] = await Promise.all([
      //   getInteropBundleData(senderProvider, receipt.transactionHash, 0),
      //   getInteropBundleData(senderProvider, receipt.transactionHash, 1),
      //   getInteropTriggerData(senderProvider, receipt.transactionHash, 2),
      // ]);
      // if (!triggerDataBundle.output) {
      //   // Not an interop transaction or broken
      //   this.logger.warn(`Transaction ${receipt.transactionHash} is not an interop transaction or has no trigger data.`);
      //   this.transactionStatusMap.delete(transactionKey);
      //   return;
      // }
      
      
      this.transactionStatusMap.set(transactionKey, {
        status: "processing",
        senderChainId: chainId,
        destinationChainId: destinationChainId,
        transactionHash: receipt.transactionHash
      });
      const destinationChain = supportedChains.find((c) => c.id === destinationChainId);
      this.logger.debug(`[${senderChain?.name || chainId}] New interop transaction to ${ destinationChain?.name || destinationChainId}: ${receipt.transactionHash}`);
      if (!destinationChain) throw new Error(`Unsupported chainId: ${destinationChainId}`);
  
      const destinationClient = this.clientService.getClient({ chainId: destinationChainId as SupportedChainId });
      const destinationProvider = new zksync.Provider(destinationChain.rpcUrls.default.http[0]);

      const proof = [
        "0x010f050000000000000000000000000000000000000000000000000000000000",
        "0x72abee45b59e344af8a6e520241c4744aff26ed411f4c4b00f8af09adada43ba",
        "0xc3d03eebfd83049991ea3d3e358b6712e7aa2e2e63dc2d4b438987cec28ac8d0",
        "0xe3697c7f33c31a9b0f0aeb8542287d0d21e8c4cf82163d0c44c7a98aa11aa111",
        "0x199cc5812543ddceeddd0fc82807646a4899444240db2c0d2f20c3cceb5f51fa",
        "0xe4733f281f18ba3ea8775dd62d2fcd84011c8c938f16ea5790fd29a03bf8db89",
        "0x1798a1fd9c8fbb818c98cff190daa7cc10b6e5ac9716b4a2649f7c2ebcef2272",
        "0x66d7c5983afe44cf15ea8cf565b34c6c31ff0cb4dd744524f7842b942d08770d",
        "0xb04e5ee349086985f74b73971ce9dfe76bbed95c84906c5dffd96504e1e5396c",
        "0xac506ecb5465659b3a927143f6d724f91d8d9c4bdb2463aee111d9aa869874db",
        "0x124b05ec272cecd7538fdafe53b6628d31188ffb6f345139aac3c3c1fd2e470f",
        "0xc3be9cbd19304d84cca3d045e06b8db3acd68c304fc9cd4cbffe6d18036cb13f",
        "0xfef7bd9f889811e59e4076a0174087135f080177302763019adaf531257e3a87",
        "0xa707d1c62d8be699d34cb74804fdd7b4c568b6c1a821066f126c680d4b83e00b",
        "0xf6e093070e0389d2e529d60fadb855fdded54976ec50ac709e3a36ceaa64c291",
        "0xe4ed1ec13a28c40715db6399f6f99ce04e5f19d60ad3ff6831f098cb6cf75944",
        "0x000000000000000000000000000000000000000000000000000000000000001e",
        "0x46700b4d40ac5c35af2c22dda2787a91eb567b06c924a8fb8ae9a05b20c08c21",
        "0x72bb6e886e3de761d93578a590bfe0e44fb544481eb63186f6a6d184aec321a8",
        "0x3cc519adb13de86ec011fa462394c5db945103c4d35919c9433d7b990de49c87",
        "0xcc52bf2ee1507ce0b5dbf31a95ce4b02043c142aab2466fc24db520852cddf5f",
        "0x40ad48c159fc740c32e9b540f79561a4760501ef80e32c61e477ac3505d3dabd",
        "0x0000000000000000000000000000009f00000000000000000000000000000001",
        "0x00000000000000000000000000000000000000000000000000000000000001fa",
        "0x0102000100000000000000000000000000000000000000000000000000000000",
        "0xf84927dc03d95cc652990ba75874891ccc5a4d79a0e10a2ffdd238a34a39f828",
        "0xe25714e53790167f58b1da56145a1c025a461008fe358f583f53d764000ca847",
      ];

      const randomL2MessageIndex = Math.floor(Math.random() * (10_000 - 100 + 1)) + 100;
      const feeBundleXl2Input = {
        destinationChainId: feeBundle.args.interopBundle.destinationChainId,
        calls:  feeBundle.args.interopBundle.calls,
        executionAddress:  feeBundle.args.interopBundle.executionAddress,
      };
      const feeBundleRawData = ethers.AbiCoder.defaultAbiCoder().encode([INTEROP_BUNDLE_ABI], [feeBundleXl2Input]);
      const feeBundleProofEncoded = ethers.AbiCoder.defaultAbiCoder().encode(
        [MESSAGE_INCLUSION_PROOF_ABI],
        [
          {
            chainId,
            l1BatchNumber: BigInt(1),
            l2MessageIndex: BigInt(randomL2MessageIndex),
            message: [BigInt(0), L2_INTEROP_CENTER_ADDRESS, feeBundleRawData],
            proof,
          }
        ]
      );

      const executionBundleXl2Input = {
        destinationChainId: executionBundle.args.interopBundle.destinationChainId,
        calls:  executionBundle.args.interopBundle.calls,
        executionAddress:  executionBundle.args.interopBundle.executionAddress,
      };
      const executionBundleRawData = ethers.AbiCoder.defaultAbiCoder().encode([INTEROP_BUNDLE_ABI], [executionBundleXl2Input]);
      const executionProofEncoded = ethers.AbiCoder.defaultAbiCoder().encode(
        [MESSAGE_INCLUSION_PROOF_ABI],
        [
          {
            chainId,
            l1BatchNumber: BigInt(1),
            l2MessageIndex: BigInt(randomL2MessageIndex+1),
            message: [BigInt(0), L2_INTEROP_CENTER_ADDRESS, executionBundleRawData],
            proof,
          }
        ]
      );

      const triggerDataBundleRawData = ethers.AbiCoder.defaultAbiCoder().encode([INTEROP_TRIGGER_ABI], [triggerDataBundle.args._interopTrigger]);
      const triggerDataProofEncoded = ethers.AbiCoder.defaultAbiCoder().encode(
        [MESSAGE_INCLUSION_PROOF_ABI],
        [
          {
            chainId,
            l1BatchNumber: BigInt(1),
            l2MessageIndex: BigInt(randomL2MessageIndex+2),
            message: [BigInt(0), L2_INTEROP_CENTER_ADDRESS, triggerDataBundleRawData],
            proof,
          }
        ]
      );

      const transactionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['bytes', 'bytes'],
        [executionBundleRawData, executionProofEncoded]
      );
      const nonce = await destinationClient.getTransactionCount({ address: L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS });
      const feeData = await destinationProvider.getFeeData();
  
      // const interopTx = {
      //   from: L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS,
      //   to: L2_INTEROP_HANDLER_ADDRESS,
      //   chainId: destinationChain.id,
      //   data: transactionData,
      //   nonce,
      //   customData: {
      //     paymasterParams: {
      //       paymaster: "0x0000000000000000000000000000000000000000",
      //       paymasterInput: "0x",
      //     },
      //     gasPerPubdata: BigInt(800),
      //     customSignature: ethers.AbiCoder.defaultAbiCoder().encode(
      //       ['bytes', 'bytes', 'address', 'address', 'bytes'],
      //       [
      //         "0x",
      //         "0x", // fullProof
      //         "0xa1cf087DB965Ab02Fb3CFaCe1f5c63935815f044",
      //         "0xa1cf087DB965Ab02Fb3CFaCe1f5c63935815f044",
      //         "0x",
      //       ]
      //     ),
      //   },
      //   maxFeePerGas: feeData.maxFeePerGas,
      //   maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
      //   gasLimit: "30000000",
      //   value: 0,
      // };
      const interopTx = {
        from: L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS,
        to: L2_INTEROP_HANDLER_ADDRESS,
        chainId: destinationChain.id,
        data: transactionData,
        nonce,
        customData: {
          paymasterParams: {
            paymaster: triggerDataBundle.args._interopTrigger.gasFields.paymaster,
            paymasterInput: triggerDataBundle.args._interopTrigger.gasFields.paymasterInput,
          },
          gasPerPubdata: triggerDataBundle.args._interopTrigger.gasFields.gasPerPubdataByteLimit,
          customSignature: ethers.AbiCoder.defaultAbiCoder().encode(
            ['bytes', 'bytes', 'address', 'address', 'bytes'],
            [
              feeBundleRawData,
              feeBundleProofEncoded, // feeBundle.fullProof
              triggerDataBundle.args._interopTrigger.sender,
              triggerDataBundle.args._interopTrigger.gasFields.refundRecipient,
              triggerDataProofEncoded, // triggerDataBundle.fullProof
            ]
          ),
        },
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        gasLimit: triggerDataBundle.args._interopTrigger.gasFields.gasLimit,
        value: 0,
      };
  
      this.transactionStatusMap.set(transactionKey, {
        status: 'broadcasting',
        senderChainId: chainId,
        destinationChainId,
        transactionHash: receipt.transactionHash,
      });
  
      const serializedTransaction = zksync.utils.serializeEip712(interopTx) as Hash;
      const transactionHash = await this.broadcastTransaction(destinationProvider, serializedTransaction);
      this.logger.debug(`[${senderChain.name}] Interop transaction sent to ${destinationChain.name}: ${transactionHash}`);
  
      this.transactionStatusMap.set(transactionKey, {
        status: 'completed',
        senderChainId: chainId,
        destinationChainId,
        transactionHash: receipt.transactionHash,
        broadcastTransactionHash: transactionHash,
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

  private async broadcastTransaction(
    destinationProvider: zksync.Provider,
    serializedTransaction: Hash
  ): Promise<Hash | null> {
    try {
      const broadcastTx = await destinationProvider.broadcastTransaction(serializedTransaction);
      await broadcastTx.wait();
      return broadcastTx.hash as Hash;
    } catch (error) {
      if (error instanceof Error && error.message.includes("known transaction")) {
        // TODO: this produces incorrect hash for some reason
        // const txHash = keccak256(toBytes(serializedTransaction));
        // this.logger.warn(`Transaction already known: ${txHash}`);
        // await destinationProvider.waitForTransaction(txHash);
        // return txHash;
        return null;
      }
      throw error;
    }
  }
  
  public async getInteropTransactionStatus(chainId: number, transactionHash: Hash): Promise<InteropTransactionStatus> {
    const key = this.getTransactionKey(chainId, transactionHash);
    
    const POLL_FOR_STATUS = 15_000;
    const start = Date.now();
    console.log(`Polling for interop transaction status: ${key}`);
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

  private getGWBlockNumber(params: FinalizeWithdrawalParams): number {
    /// see hashProof in MessageHashing.sol for this logic.
    let gwProofIndex =
        1 + parseInt(params.proof[0].slice(4, 6), 16) + 1 + parseInt(params.proof[0].slice(6, 8), 16);
    console.log('params', params, gwProofIndex, parseInt(params.proof[gwProofIndex].slice(2, 34), 16));
    return parseInt(params.proof[gwProofIndex].slice(2, 34), 16);
  }

  public async waitForLogProof(
    provider: zksync.Provider,
    transactionHash: Hash,
    index = 0,
  ) {
    let resolved = false;
    let time = new Date().getTime();
    const checkInterval = 5000; // 5 seconds
    while (true) {
      if (resolved) throw new Error(`Resolved`);
      const minutesPassed = Math.floor((new Date().getTime() - time) / 60000);
      console.log(`Waiting for log proof for transaction: ${transactionHash}: ${minutesPassed}m`);
      const senderUtilityWallet = new zksync.Wallet(zksync.Wallet.createRandom().privateKey, provider);
      try {
        const params = await senderUtilityWallet.getFinalizeWithdrawalParams(transactionHash, 0, 0, 'gw_message_root');
        return params;
      } catch (error) {
        if (error instanceof Error && error.message.includes("Log proof not found!")) {
          await new Promise((resolve) => setTimeout(resolve, checkInterval));
          continue;
        }
        throw error;
      }
    }
  }

  public parseTransactionEvents(receipt: TransactionReceipt) {
    const topics = parseEventLogs({
      abi: INTEROP_CENTER_ABI, 
      logs: receipt.logs
    });
    const bundleEvents = topics.filter((topic) => topic.eventName === 'InteropBundleSent');
    const triggerEvents = topics.filter((topic) => topic.eventName === 'InteropTriggerSent');
    return {
      bundleEvents,
      triggerEvents,
    }
  }
}
