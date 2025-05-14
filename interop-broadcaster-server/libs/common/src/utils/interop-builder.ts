import { ethers } from "ethers";
import { type Address, erc20Abi, type Hash, PublicClient, WalletClient } from "viem";
import { L2_ASSET_ROUTER_ADDRESS, L2_INTEROP_CENTER_ADDRESS, L2_INTEROP_HANDLER_ADDRESS, L2_NATIVE_TOKEN_VAULT_ADDRESS, L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS, REQUIRED_L2_GAS_PRICE_PER_PUBDATA } from "./constants";
import { INTEROP_CENTER_ABI, INTEROP_HANDLER_ABI } from "./abis";

interface InteropCallStarter {
  directCall: boolean;
  nextContract: Address;
  data: Hash;
  value: bigint;
  requestedInteropCallValue: bigint;
}

export class InteropTransactionBuilder {
  private fromChainId: number;
  private toChainId: number;
  private feeCallStarters: InteropCallStarter[] = [];
  private execCallStarters: InteropCallStarter[] = [];
  private senderAddress: Address;

  constructor(
    fromChainId: number, 
    toChainId: number, 
    feeValue: bigint, 
    senderAddress: Address,
    private readonly publicClient: PublicClient,
    private readonly walletClient: WalletClient
  ) {
    this.fromChainId = fromChainId;
    this.toChainId = toChainId;
    this.senderAddress = senderAddress;

    this.feeCallStarters.push({
      directCall: true,
      nextContract: L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS,
      data: "0x",
      value: BigInt(0),
      requestedInteropCallValue: feeValue,
    });
  }

  addTransfer({ assetId, amount, to }: { assetId: Hash; amount: bigint; to: Address }) {
    const data = this.getTokenTransferSecondBridgeData(assetId, amount, to);
    this.execCallStarters.push({
      directCall: false,
      nextContract: L2_ASSET_ROUTER_ADDRESS,
      data,
      value: BigInt(0),
      requestedInteropCallValue: BigInt(0),
    });
  }

  addTransaction({ directCall, nextContract, data, value, requestedInteropCallValue }: { directCall: boolean; nextContract: Address; data: Hash; value: bigint; requestedInteropCallValue: bigint; }) {
    this.execCallStarters.push({
      directCall,
      nextContract,
      data,
      value,
      requestedInteropCallValue,
    });
  }

  async checkAllowance(tokenAddress: Address): Promise<bigint> {
    return await this.publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "allowance",
      args: [this.senderAddress, L2_NATIVE_TOKEN_VAULT_ADDRESS],
    });
  }

  async approveNativeTokenVault(tokenAddress: Address, amount: bigint): Promise<void> {
    const currentAllowance = await this.checkAllowance(tokenAddress);

    if (currentAllowance >= amount) return;

    const txHash = await this.walletClient.writeContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [L2_NATIVE_TOKEN_VAULT_ADDRESS, amount],
    } as any);

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status !== "success") throw new Error("Approval failed");
  }

  async send(): Promise<Hash> {
    const totalValue = [...this.feeCallStarters, ...this.execCallStarters].reduce(
      (acc, curr) => acc + curr.requestedInteropCallValue,
      BigInt(0),
    );

    const transactionHash = await this.walletClient.writeContract({
      address: L2_INTEROP_CENTER_ADDRESS,
      abi: INTEROP_CENTER_ABI,
      functionName: "requestInterop",
      value: totalValue,
      args: [
        BigInt(this.toChainId),
        L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS,
        this.feeCallStarters,
        this.execCallStarters,
        {
          gasLimit: BigInt(30_000_000),
          gasPerPubdataByteLimit: BigInt(REQUIRED_L2_GAS_PRICE_PER_PUBDATA),
          refundRecipient: this.senderAddress,
          paymaster: "0x0000000000000000000000000000000000000000" as Address,
          paymasterInput: "0x",
        },
      ],
    } as any);
    console.log("Interop transaction submitted");

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash: transactionHash });
    if (receipt.status !== "success") throw new Error("Interop transaction failed");
    console.log(`Interop transaction processed on chain ${this.fromChainId}`);

    return transactionHash;
  }

  private getTokenTransferSecondBridgeData(assetId: Hash, amount: bigint, recipient: Address): Hash {
    return ethers.concat([
      "0x01",
      new ethers.AbiCoder().encode(
        ["bytes32", "bytes"],
        [
          assetId,
          new ethers.AbiCoder().encode(["uint256", "address", "address"], [amount, recipient, ethers.ZeroAddress]),
        ],
      ),
    ]) as Hash;
  }

  async waitUntilInteropTxProcessed(txStatusFunction: (txHash: Hash) => Promise<any>, transactionHash: Hash, pollingInterval = 250, maxAttempts = 250) {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      attempts++;
      const data = await txStatusFunction(transactionHash);
      if (data.status === "not_found") {
        throw new Error(`Interop transaction not found: ${transactionHash}`);
      } else if (data.status === "broadcasting_failed") {
        throw new Error(
          `Transaction broadcast failed, likely transaction failed on the destination chain. Hash: ${data.broadcastTransactionHash}`,
        );
      }
      if (data.status === "completed") {
        break;
      }
      
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, pollingInterval));
      } else {
        throw new Error(`Interop transaction timed out after ${maxAttempts} attempts. Last status: ${data.status}`);
      }
    }
  }
}