import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createWalletClient, getAddress, http, PublicClient, WalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ClientService } from '../client';
import { chain1 } from '@app/common/chains';

interface MintRequest {
  address: string;
  resolve: (value: void | PromiseLike<void>) => void;
  reject: (reason?: any) => void;
}

// TestnetERC20Token mint function ABI
const mintAbi = [
  {
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_amount', type: 'uint256' }
    ],
    name: 'mint',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const;

@Injectable()
export class MintTestFundsService {
  private readonly logger: Logger;
  private readonly mintQueue: MintRequest[] = [];
  private isProcessing = false;
  private readonly pendingAddresses = new Set<string>();
  private walletClientInstance: WalletClient | null = null;
  
  // Config properties
  private readonly minterPrivateKey: string;
  private readonly ethMintAmount: bigint;
  private readonly usdcMintAmount: bigint;
  private readonly ttbillMintAmount: bigint;
  private readonly usdcAddress: string | undefined;
  private readonly ttbillAddress: string | undefined;

  constructor(
    private readonly clientService: ClientService,
    private readonly configService: ConfigService,
  ) {
    this.logger = new Logger(MintTestFundsService.name);
    
    // Get all config values once
    this.minterPrivateKey = this.configService.get<string>('minter.privateKey');
    this.ethMintAmount = this.configService.get<bigint>('mintAmounts.eth');
    this.usdcMintAmount = this.configService.get<bigint>('mintAmounts.usdc');
    this.ttbillMintAmount = this.configService.get<bigint>('mintAmounts.ttbill');
    this.usdcAddress = this.configService.get<string>('tokens.usdcChainA');
    this.ttbillAddress = this.configService.get<string>('tokens.ttbillChainA');
  }

  private getMinterClient() {
    if (!this.minterPrivateKey) {
      throw new Error('MINTER_PRIVATE_KEY environment variable is not set');
    }
    const account = privateKeyToAccount(this.minterPrivateKey as `0x${string}`);
    const client = createWalletClient({
      account: privateKeyToAccount(this.minterPrivateKey as `0x${string}`),
      chain: chain1,
      transport: http(),
      pollingInterval: 500,
    });
    return client;
  }

  public async mintFunds(address: string): Promise<void> {
    try {
      // Normalize address to checksum format for consistent comparison
      const normalizedAddress = getAddress(address);

      // If this address is already in the queue, reuse the existing promise
      if (this.pendingAddresses.has(normalizedAddress)) {
        this.logger.log(`Address ${normalizedAddress} is already in the mint queue, reusing existing request`);
        return new Promise<void>((resolve, reject) => {
          this.mintQueue.push({ address: normalizedAddress, resolve, reject });
        });
      }

      // Add to pending set to track duplicates
      this.pendingAddresses.add(normalizedAddress);

      // Create a new promise for this mint request
      return new Promise<void>((resolve, reject) => {
        this.mintQueue.push({ address: normalizedAddress, resolve, reject });
        
        // Start processing the queue if not already running
        if (!this.isProcessing) {
          this.processQueue();
        }
      });
    } catch (error) {
      this.logger.error(error);
      this.logger.error(`Error queueing mint for address ${address}`);
      throw error;
    }
  }

  private async processQueue() {
    if (this.isProcessing || this.mintQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.mintQueue.length > 0) {
        const request = this.mintQueue[0];
        
        try {
          await this.executeMint(request.address);
          request.resolve();
        } catch (error) {
          this.logger.error(error);
          this.logger.error(`Failed to mint funds for ${request.address}`);
          request.reject(error);
        } finally {
          // Remove the processed request and its address from pending set
          this.mintQueue.shift();
          this.pendingAddresses.delete(request.address);
        }
      }
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Error processing mint queue');
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeMint(address: string): Promise<void> {
    const publicClient = this.clientService.getClient({ chainId: chain1.id }) as PublicClient;
    
    try {
      // Send ETH
      this.logger.log(`Sending ETH to ${address}`);
      const ethTxHash = await this.getMinterClient().sendTransaction({
        to: address as `0x${string}`,
        value: this.ethMintAmount,
      } as any);
      
      const ethReceipt = await publicClient.waitForTransactionReceipt({ hash: ethTxHash });
      this.logger.log(`ETH sent to ${address}, transaction hash: ${ethTxHash}`);

      // Mint USDC
      if (this.usdcAddress) {
        this.logger.log(`Minting USDC for ${address}`);
        await this.mintToken(this.usdcAddress, address, this.usdcMintAmount);
      }

      // Mint TTBILL
      if (this.ttbillAddress) {
        this.logger.log(`Minting TTBILL for ${address}`);
        await this.mintToken(this.ttbillAddress, address, this.ttbillMintAmount);
      }

      this.logger.log(`Successfully minted funds for ${address}`);
    } catch (error) {
      this.logger.error(error);
      this.logger.error(`Error minting funds for ${address}`);
      throw error;
    }
  }

  private async mintToken(tokenAddress: string, userAddress: string, amount: bigint): Promise<void> {
    const publicClient = this.clientService.getClient({ chainId: chain1.id }) as PublicClient;

    try {
      const txHash = await this.getMinterClient().writeContract({
        address: tokenAddress as `0x${string}`,
        abi: mintAbi,
        functionName: 'mint',
        args: [userAddress, amount]
      } as any);

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      
      if (receipt.status !== 'success') {
        throw new Error(`Token minting transaction failed: ${txHash}`);
      }

      this.logger.log(`Token minted for ${userAddress} at ${tokenAddress}, transaction hash: ${txHash}`);
    } catch (error) {
      this.logger.error(error);
      this.logger.error(`Error minting token ${tokenAddress} for ${userAddress}`);
      throw error;
    }
  }
}