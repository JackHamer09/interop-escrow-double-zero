import { ethers } from "ethers";
import { type Address, type Hash, erc20Abi, getAddress, zeroAddress } from "viem";
import { readContract, writeContract } from "wagmi/actions";
import { INTEROP_CENTER_ABI } from "~~/contracts/interop-center";
import { INTEROP_HANDLER_ABI } from "~~/contracts/interop-handler";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";
import {
  L2_ASSET_ROUTER_ADDRESS,
  L2_INTEROP_CENTER_ADDRESS,
  L2_INTEROP_HANDLER_ADDRESS,
  L2_NATIVE_TOKEN_VAULT_ADDRESS,
  L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS,
  REQUIRED_L2_GAS_PRICE_PER_PUBDATA,
} from "~~/utils/constants";
import { env } from "~~/utils/env";
import waitForTransactionReceipt from "~~/utils/wait-for-transaction";

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

  constructor(fromChainId: number, toChainId: number, feeValue: bigint, senderAddress: Address) {
    this.fromChainId = fromChainId;
    this.toChainId = toChainId;
    this.senderAddress = senderAddress;

    this.feeCallStarters.push({
      directCall: true,
      nextContract: L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS,
      data: "0x",
      value: 0n,
      requestedInteropCallValue: feeValue,
    });
  }

  addTransfer({ assetId, amount, to }: { assetId: Hash; amount: bigint; to: Address }) {
    const data = this.getTokenTransferSecondBridgeData(assetId, amount, to);
    this.execCallStarters.push({
      directCall: false,
      nextContract: L2_ASSET_ROUTER_ADDRESS,
      data,
      value: 0n,
      requestedInteropCallValue: 0n,
    });
  }

  addTransaction({ contractAddress, data, value }: { contractAddress: Address; data: Hash; value: bigint }) {
    this.execCallStarters.push({
      directCall: true,
      nextContract: contractAddress,
      data,
      value,
      requestedInteropCallValue: 0n,
    });
  }

  async checkAllowance(tokenAddress: Address): Promise<bigint> {
    return await readContract(wagmiConfig, {
      chainId: this.fromChainId,
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "allowance",
      args: [this.senderAddress, L2_NATIVE_TOKEN_VAULT_ADDRESS],
    });
  }

  async approveNativeTokenVault(tokenAddress: Address, amount: bigint): Promise<void> {
    const currentAllowance = await this.checkAllowance(tokenAddress);

    if (currentAllowance >= amount) return;

    const txHash = await writeContract(wagmiConfig, {
      chainId: this.fromChainId,
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [L2_NATIVE_TOKEN_VAULT_ADDRESS, amount],
    });

    const receipt = await waitForTransactionReceipt({ chainId: this.fromChainId, hash: txHash });
    if (receipt.status !== "success") throw new Error("Approval failed");
  }

  async send(): Promise<Hash> {
    const totalValue = [...this.feeCallStarters, ...this.execCallStarters].reduce(
      (acc, curr) => acc + curr.requestedInteropCallValue,
      0n,
    );

    const transactionHash = await writeContract(wagmiConfig, {
      chainId: this.fromChainId,
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
          gasLimit: 30_000_000n,
          gasPerPubdataByteLimit: BigInt(REQUIRED_L2_GAS_PRICE_PER_PUBDATA),
          refundRecipient: this.senderAddress,
          paymaster: zeroAddress,
          paymasterInput: "0x",
        },
      ],
    });
    console.log("Interop transaction submitted");

    const receipt = await waitForTransactionReceipt({ chainId: this.fromChainId, hash: transactionHash });
    if (receipt.status !== "success") throw new Error("Interop transaction failed");
    console.log(`Interop transaction processed on chain ${this.fromChainId}`);

    return transactionHash;
  }

  public async getAliasedAddress(address: Address): Promise<Address> {
    return await readContract(wagmiConfig, {
      chainId: this.toChainId,
      address: L2_INTEROP_HANDLER_ADDRESS,
      abi: INTEROP_HANDLER_ABI,
      functionName: "getAliasedAccount",
      args: [getAddress(address.toLowerCase()), BigInt(this.fromChainId)],
    });
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

  public async waitUntilInteropTxProcessed(transactionHash: Hash, pollingInterval = 250) {
    while (true) {
      const data = await fetch(
        `${env.NEXT_PUBLIC_INTEROP_BROADCASTER_API}/api/interop-transaction-status/?transactionHash=${transactionHash}&senderChainId=${this.fromChainId}`,
      ).then(res => res.json());
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
      console.log(`Interop transaction status: ${data.status}`);
      await new Promise(resolve => setTimeout(resolve, pollingInterval));
    }
  }
}
