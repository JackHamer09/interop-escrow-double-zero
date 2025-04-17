import { getGasPrice } from "@wagmi/core";
import { type Address } from "abitype";
import * as ethers from "ethers";
import { type Hash, getAddress } from "viem";
import { useAccount, useSwitchChain, useWriteContract } from "wagmi";
import { readContract, waitForTransactionReceipt } from "wagmi/actions";
import { INTEROP_CENTER_ABI } from "~~/contracts/interop-center";
import { ERC20_ABI } from "~~/contracts/tokens";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";
import {
  L2_ASSET_ROUTER_ADDRESS,
  L2_INTEROP_HANDLER_ADDRESS,
  L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS,
  REQUIRED_L2_GAS_PRICE_PER_PUBDATA,
} from "~~/utils/constants";

// Types for interop call starters and gas fields.
interface InteropCallStarter {
  directCall: boolean;
  nextContract: string;
  data: string;
  value: bigint;
  // The interop call value must be pre-determined.
  requestedInteropCallValue: bigint;
}

export default function useInteropTransfer() {
  const account = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();

  async function switchChainIfNotSet(chainId: number) {
    if (account.chainId !== chainId) {
      await switchChainAsync({ chainId });
    }
  }

  async function approveNativeTokenVault(args: { chainId: number; amount: bigint; tokenAddress: Address }) {
    await switchChainIfNotSet(args.chainId);
    const transactionHash = await writeContractAsync({
      chainId: args.chainId,
      address: args.tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [L2_ASSET_ROUTER_ADDRESS, args.amount],
    });
    const receipt = await waitForTransactionReceipt(wagmiConfig, { chainId: args.chainId, hash: transactionHash });
    if (!receipt) throw new Error("Transaction failed");
    if (receipt.status !== "success") throw new Error("Transaction failed");
    return receipt;
  }

  async function interopTransfer(args: {
    from: {
      chainId: number;
    };
    recipient: {
      chainId: number;
      address: string;
    };
    token: {
      address: Address;
      assetId: Hash;
      amount: bigint;
    };
  }) {
    // await approveNativeTokenVault({
    //   chainId: args.from.chainId,
    //   amount: args.token.amount,
    //   tokenAddress: args.token.address,
    // });
    // console.log("token approved");

    // console.log("Getting aliased address");
    // const aliasedAddress = await getAliasedAddress(args.recipient.chainId, args.recipient.address);
    // console.log("aliasedAddress", aliasedAddress);
    const aliasedAddress = "0x7301AfAb6701AFcE1aD88149b7cE52B67D9836E1";

    // Compose and send the interop request transaction
    const feeValue = ethers.parseEther("1");
    console.log("Requesting interop");
    const { transactionHash } = await requestInterop(
      args.from.chainId,
      args.recipient.chainId,
      // Fee payment call starters
      [
        {
          directCall: true,
          nextContract: L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS,
          data: "0x",
          value: 0n,
          requestedInteropCallValue: feeValue,
        },
      ],
      // Execution call starters for token transfer
      [
        {
          directCall: false,
          nextContract: L2_ASSET_ROUTER_ADDRESS,
          data: getTokenTransferSecondBridgeData(args.token.assetId, args.token.amount, aliasedAddress),
          value: 0n,
          requestedInteropCallValue: 0n,
        },
      ],
    );
    await waitUntilInteropTxProcessed(transactionHash, args.from.chainId);
    console.log("Interop transaction processed");
  }

  /**
   * Sends a direct L2 transaction request on Interop1.
   * The function prepares the interop call input and populates the transaction before sending.
   */
  async function requestInterop(
    fromChainId: number,
    toChainId: number,
    feeCallStarters: InteropCallStarter[],
    execCallStarters: InteropCallStarter[],
  ) {
    if (!account.address) throw new Error("Account address is not available");
    const totalValue = [...feeCallStarters, ...execCallStarters].reduce(
      (total, item) => total + BigInt(item.requestedInteropCallValue),
      0n as bigint,
    );
    await switchChainIfNotSet(fromChainId);
    console.log("writeContractAsync");
    const transactionHash = await writeContractAsync({
      chainId: fromChainId,
      abi: INTEROP_CENTER_ABI,
      address: L2_INTEROP_HANDLER_ADDRESS,
      functionName: "requestInterop",
      value: totalValue as any,
      gas: 600000000n,
      // gasPrice: await getGasPrice(wagmiConfig, {
      //   chainId: fromChainId,
      // }),
      maxFeePerGas: 600000000n,
      maxPriorityFeePerGas: 600000000n,
      args: [
        BigInt(toChainId),
        L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS,
        feeCallStarters,
        execCallStarters,
        {
          gasLimit: 60000000n,
          gasPerPubdataByteLimit: BigInt(REQUIRED_L2_GAS_PRICE_PER_PUBDATA),
          refundRecipient: account.address,
          paymaster: ethers.ZeroAddress,
          paymasterInput: "0x",
        },
      ],
    });
    console.log("Interop transactionHash", transactionHash);
    const receipt = await waitForTransactionReceipt(wagmiConfig, { chainId: fromChainId, hash: transactionHash });
    return receipt;
  }

  async function getAliasedAddress(chainId: number, address: Address): Promise<Address> {
    const abi = [
      {
        type: "function",
        name: "getAliasedAccount",
        inputs: [
          { name: "fromAsSalt", type: "address", internalType: "address" },
          { name: "chainId", type: "uint256", internalType: "uint256" },
        ],
        outputs: [{ name: "aliasedAddress", type: "address", internalType: "address" }],
        stateMutability: "view",
      },
    ] as const;
    await switchChainIfNotSet(chainId);
    return await readContract(wagmiConfig, {
      chainId,
      address: L2_INTEROP_HANDLER_ADDRESS,
      abi,
      functionName: "getAliasedAccount",
      args: [getAddress(address.toLowerCase()), 0n], // <- Chain ID? Why does it work with any value right now...
    });
  }

  async function waitUntilInteropTxProcessed(
    transactionHash: string,
    senderChainId: string | number,
    pollingInterval = 500,
  ) {
    while (true) {
      const interopStatus = await fetch(
        `http://localhost:3030/api/interop-transaction-status/?transactionHash=${transactionHash}&senderChainId=${senderChainId}`,
      )
        .then(res => res.json())
        .then(data => data.status);
      if (interopStatus === "not_found") {
        throw new Error(`Interop transaction not found: ${transactionHash}`);
      }
      if (interopStatus === "completed") {
        break;
      }
      console.log(`Interop transaction status: ${interopStatus}`);
      await new Promise(resolve => setTimeout(resolve, pollingInterval));
    }
  }

  return {
    interopTransfer,
  };
}

/**
 * Generates ABI-encoded data for transferring tokens using the second bridge.
 */
function getTokenTransferSecondBridgeData(assetId: Hash, amount: bigint, recipient: Address) {
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
