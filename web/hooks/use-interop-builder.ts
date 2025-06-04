import { ethers } from "ethers";
import { type Address, type Hash, erc20Abi, getAddress } from "viem";
import { readContract, writeContract } from "wagmi/actions";
import { systemContracts } from "~~/config/chains-config";
import { INTEROP_CENTER_ABI } from "~~/contracts/interop-center";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";
import { env } from "~~/utils/env";
import waitForTransactionReceipt from "~~/utils/wait-for-transaction";

interface InteropCallStarter {
  directCall: boolean;
  nextContract: string;
  data: string;
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

    const l2StandardTriggerAccount = systemContracts.l2StandardTriggerAccount;

    this.feeCallStarters.push({
      directCall: true,
      nextContract: l2StandardTriggerAccount,
      data: "0x",
      value: 0n,
      requestedInteropCallValue: feeValue,
    });
  }

  addTransfer({ assetId, amount, to }: { assetId: Hash; amount: bigint; to: Address }) {
    const data = this.getTokenTransferSecondBridgeData(assetId, amount, to);
    this.execCallStarters.push({
      directCall: false,
      nextContract: systemContracts.l2AssetRouter,
      data,
      value: 0n,
      requestedInteropCallValue: 0n,
    });
  }

  addTransaction({ contractAddress, data, value }: { contractAddress: Address; data: string; value: bigint }) {
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
      args: [this.senderAddress, systemContracts.l2NativeTokenVault],
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
      args: [systemContracts.l2NativeTokenVault, amount],
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
      address: systemContracts.l2InteropCenter,
      abi: INTEROP_CENTER_ABI,
      functionName: "requestInterop",
      value: totalValue,
      args: [
        BigInt(this.toChainId),
        systemContracts.l2StandardTriggerAccount,
        this.feeCallStarters,
        this.execCallStarters,
        {
          gasLimit: 30_000_000n,
          gasPerPubdataByteLimit: 800n, // REQUIRED_L2_GAS_PRICE_PER_PUBDATA
          refundRecipient: this.senderAddress,
          paymaster: ethers.ZeroAddress,
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
      address: systemContracts.l2InteropHandler,
      abi: [
        {
          type: "function",
          name: "getAliasedAccount",
          inputs: [
            { name: "fromAsSalt", type: "address", internalType: "address" },
            { name: "", type: "uint256", internalType: "uint256" },
          ],
          outputs: [{ name: "", type: "address", internalType: "address" }],
          stateMutability: "view",
        },
      ],
      functionName: "getAliasedAccount",
      args: [getAddress(address.toLowerCase()), BigInt(this.fromChainId)],
    });
  }

  private getTokenTransferSecondBridgeData(assetId: Hash, amount: bigint, recipient: Address): string {
    return ethers.concat([
      "0x01",
      new ethers.AbiCoder().encode(
        ["bytes32", "bytes"],
        [
          assetId,
          new ethers.AbiCoder().encode(["uint256", "address", "address"], [amount, recipient, ethers.ZeroAddress]),
        ],
      ),
    ]);
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
