import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createWalletClient, getAddress, http, PublicClient, WalletClient, parseEther, erc20Abi, Hash, Address, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ClientService } from '../client';
import { chain1, chain2 } from '@app/common/chains';
import { InteropBroadcasterService } from '../interop-broadcaster/interop-broadcaster.service';
import { InteropTransactionBuilder } from '@app/common/utils/interop-builder';
import { L2_NATIVE_TOKEN_VAULT_ADDRESS } from '@app/common/utils/constants';
import { ZeroAddress } from 'ethers';

interface MintRequest {
  address: Address;
  resolve: (value: void | PromiseLike<void>) => void;
  reject: (reason?: any) => void;
}

interface TokenInfo {
  name: string;
  address_chain1: Address;
  assetId: Hash;
  mintAmount: bigint;
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

// Using InteropTransactionBuilder from common utils

@Injectable()
export class MintTestFundsService {
  private readonly logger: Logger;
  private readonly mintQueue: MintRequest[] = [];
  private isProcessing = false;
  private readonly pendingAddresses = new Set<string>();
  private walletClientInstance: WalletClient | null = null;
  
  // Config properties
  private readonly minterPrivateKey: Hash;
  private readonly ethMintAmount: bigint;
  private readonly supportedTokens: TokenInfo[] = [];

  constructor(
    private readonly clientService: ClientService,
    private readonly configService: ConfigService,
    private readonly interopBroadcasterService: InteropBroadcasterService,
  ) {
    this.logger = new Logger(MintTestFundsService.name);
    
    // Get all config values once
    this.minterPrivateKey = this.configService.get<Hash>('minter.privateKey');
    this.ethMintAmount = this.configService.get<bigint>('mintAmounts.eth');
    
    // Initialize USDC token info
    const usdcMintAmount = this.configService.get<bigint>('mintAmounts.usdc');
    const usdcAddressChain1 = this.configService.get<Address>('tokens.usdcChainA');
    const usdcAssetId = this.configService.get<Hash>('tokens.usdcAssetId');
    if (usdcAddressChain1 && usdcAssetId) {
      this.supportedTokens.push({
        name: 'USDC',
        address_chain1: usdcAddressChain1,
        assetId: usdcAssetId,
        mintAmount: usdcMintAmount
      });
    } else {
      this.logger.warn('USDC token address or asset ID not found in config');
    }
    
    // Initialize TTBILL token info
    const ttbillMintAmount = this.configService.get<bigint>('mintAmounts.ttbill');
    const ttbillAddressChain1 = this.configService.get<Address>('tokens.ttbillChainA');
    const ttbillAssetId = this.configService.get<Hash>('tokens.ttbillAssetId');
    if (ttbillAddressChain1 && ttbillAssetId) {
      this.supportedTokens.push({
        name: 'TTBILL',
        address_chain1: ttbillAddressChain1,
        assetId: ttbillAssetId,
        mintAmount: ttbillMintAmount
      });
    } else {
      this.logger.warn('TTBILL token address or asset ID not found in config');
    }
  }

  private getMinterClient(chainId: number = chain1.id) {
    if (!this.minterPrivateKey) {
      throw new Error('MINTER_PRIVATE_KEY environment variable is not set');
    }
    
    const chain = chainId === chain1.id ? chain1 : chain2;
    
    const client = createWalletClient({
      account: privateKeyToAccount(this.minterPrivateKey),
      chain,
      transport: http(),
      pollingInterval: 500,
    });
    
    return client;
  }

  public async mintFunds(address: Address): Promise<void> {
    try {
      if (!this.supportedTokens.length) {
        throw new InternalServerErrorException('No supported tokens provided for minting');
      }

      // Normalize address to checksum format for consistent comparison
      const normalizedAddress = getAddress(address.toLowerCase());

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

  private async executeMint(address: Address): Promise<void> {
    const minterAddress = this.getMinterClient().account.address;
    
    try {
      // 1. Send ETH on chain1
      await this.sendEthOnChain1(address);
      
      // 2. Check and ensure minter has enough tokens
      await this.ensureMinterTokens(minterAddress);
      
      // 3. Mint tokens on chain1 when needed
      await this.mintTokensOnChain1(address);
      
      // 4. Send tokens to chain2 via interop
      await this.sendTokensToChain2ViaInterop(minterAddress, address);
    } catch (error) {
      this.logger.error(error);
      this.logger.error(`Error minting funds for ${address}`);
      throw error;
    }
  }

  private async sendEthOnChain1(address: string): Promise<void> {
    const publicClient1 = this.clientService.getClient({ chainId: chain1.id });
    const minterClient = this.getMinterClient();
    const minterBalance = await publicClient1.getBalance({ address: minterClient.account.address });

    if (minterBalance < this.ethMintAmount) {
      this.logger.error(`Minter has insufficient ETH balance on ${chain1.name}: ${formatEther(minterBalance)}`);
      throw new InternalServerErrorException('Minter has insufficient ETH balance');
    }
    
    this.logger.log(`Sending ETH to ${address} on ${chain1.name}`);
    const ethTxHash = await minterClient.sendTransaction({
      to: address,
      value: this.ethMintAmount,
    } as any);
    
    await publicClient1.waitForTransactionReceipt({ hash: ethTxHash });
    this.logger.log(`ETH sent to ${address} on ${chain1.name}, transaction hash: ${ethTxHash}`);
  }

  private async mintTokensOnChain1(userAddress: Address): Promise<void> {
    const publicClient1 = this.clientService.getClient({ chainId: chain1.id }) as PublicClient;
    
    for (const token of this.supportedTokens) {
      // Check user balance first
      const userBalance = await publicClient1.readContract({
        address: token.address_chain1,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [userAddress]
      });

      if (userBalance < token.mintAmount) {
        this.logger.log(`Minting ${token.name} for ${userAddress} on ${chain1.name}`);
        await this.mintToken(token.address_chain1, userAddress, token.mintAmount);
      } else {
        this.logger.log(`User ${userAddress} already has sufficient ${token.name} on ${chain1.name}, skipping mint`);
      }
    }
  }

  private async ensureMinterTokens(minterAddress: Address): Promise<void> {
    const publicClient = this.clientService.getClient({ chainId: chain1.id }) as PublicClient;
    
    // Check and mint tokens for minter if needed and approve for NativeTokenVault
    for (const token of this.supportedTokens) {
      // Check minter balance
      const minterBalance = await publicClient.readContract({
        address: token.address_chain1,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [minterAddress]
      });

      if (minterBalance < token.mintAmount) {
        this.logger.log(`Minting ${token.name} for minter, current balance: ${minterBalance}`);
        await this.mintToken(token.address_chain1, minterAddress, token.mintAmount * BigInt(1000));
      }

      // Check NativeTokenVault allowance
      const allowance = await publicClient.readContract({
        address: token.address_chain1,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [minterAddress, L2_NATIVE_TOKEN_VAULT_ADDRESS]
      });

      if (allowance < token.mintAmount) {
        this.logger.log(`Approving ${token.name} for NativeTokenVault`);
        const txHash = await this.getMinterClient().writeContract({
          address: token.address_chain1,
          abi: erc20Abi,
          functionName: 'approve',
          args: [L2_NATIVE_TOKEN_VAULT_ADDRESS, token.mintAmount * BigInt(1000)]
        } as any);

        await publicClient.waitForTransactionReceipt({ hash: txHash });
        this.logger.log(`${token.name} approval completed: ${txHash}`);
      }
    }
  }

  private async mintToken(tokenAddress: string, userAddress: string, amount: bigint): Promise<void> {
    const publicClient = this.clientService.getClient({ chainId: chain1.id }) as PublicClient;

    try {
      const txHash = await this.getMinterClient().writeContract({
        address: tokenAddress,
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

  private async sendTokensToChain2ViaInterop(
    minterAddress: Address,
    userAddress: Address
  ): Promise<void> {    
    try {
      // Fee amount for interop transaction
      const feeAmount = parseEther("0.1");
      const tokensToSend = this.supportedTokens;
      
      // Log which tokens are being sent
      const tokenNames = tokensToSend.map(t => t.name).join(', ');
      this.logger.log(`Sending ${tokenNames} to ${userAddress} on ${chain2.name} via interop`);
      
      // Create the interop transaction builder
      const publicClient = this.clientService.getClient({ chainId: chain1.id });
      const minterClient = this.getMinterClient();
      const builder = new InteropTransactionBuilder(
        chain1.id,
        chain2.id,
        feeAmount,
        minterAddress,
        publicClient,
        minterClient,
      );
      
      builder.addTransaction({
        directCall: true,
        nextContract: userAddress,
        data: '0x',
        value: BigInt(0),
        requestedInteropCallValue: this.ethMintAmount,
      });

      // Add token transfers for each token
      for (const token of tokensToSend) {
        builder.addTransfer({
          assetId: token.assetId,
          amount: token.mintAmount,
          to: userAddress
        });
      }
      
      // Send the interop transaction
      const txHash = await builder.send();
      this.logger.log(`Interop transaction sent: ${txHash}`);
      
      // Wait for interop transaction to be processed
      this.logger.log(`Waiting for interop transaction to be processed on ${chain2.name}...`);
      
      // Use the waitUntilInteropTxProcessed method from our builder
      await builder.waitUntilInteropTxProcessed(
        async (hash) => await this.interopBroadcasterService.getInteropTransactionStatus(chain1.id, hash),
        txHash,
      );
      
      this.logger.log(`Interop transaction completed successfully: ${txHash}`);

    } catch (error) {
      this.logger.error(`Error sending tokens via interop: ${error}`);
      throw error;
    }
  }
}