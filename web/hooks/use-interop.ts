import { useEthersSigner } from "./use-ethers-signer";
import { type Address } from "abitype";
import * as ethers from "ethers";
import { type Hash, encodeAbiParameters, getAddress, keccak256 } from "viem";
import { useAccount, useSwitchChain, useWriteContract } from "wagmi";
import { readContract, waitForTransactionReceipt } from "wagmi/actions";
import * as zksync from "zksync-ethers-interop-support";
import { INTEROP_CENTER_ABI } from "~~/contracts/interop-center";
import { ERC20_ABI } from "~~/contracts/tokens";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";
import {
  L2_ASSET_ROUTER_ADDRESS,
  L2_INTEROP_CENTER_ADDRESS,
  L2_INTEROP_HANDLER_ADDRESS,
  L2_NATIVE_TOKEN_VAULT_ADDRESS,
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
  const signer = useEthersSigner();

  async function switchChainIfNotSet(chainId: number) {
    if (account.chainId !== chainId) {
      await switchChainAsync({ chainId });
    }
  }

  async function approveNativeTokenVault(args: { chainId: number; amount: bigint; tokenAddress: Address }) {
    if (!account.address) throw new Error("Account address is not available");

    await switchChainIfNotSet(args.chainId);
    const allowanceAddress = L2_NATIVE_TOKEN_VAULT_ADDRESS;
    const getCurrentAllowance = await readContract(wagmiConfig, {
      chainId: args.chainId,
      address: args.tokenAddress,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [account.address, allowanceAddress],
    });
    if (getCurrentAllowance >= args.amount) {
      console.log("Enough NativeTokenVault allowance");
      return;
    }

    const transactionHash = await writeContractAsync({
      chainId: args.chainId,
      address: args.tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [allowanceAddress, args.amount],
    });
    const receipt = await waitForTransactionReceipt(wagmiConfig, { chainId: args.chainId, hash: transactionHash });
    if (receipt.status !== "success") throw new Error("Approve transaction failed");
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
    await approveNativeTokenVault({
      chainId: args.from.chainId,
      amount: args.token.amount,
      tokenAddress: args.token.address,
    });

    console.log("Getting aliased address...");
    const aliasedAddress = await getAliasedAddress(0, args.recipient.address);
    console.log("aliasedAddress address:", aliasedAddress);

    // Compose and send the interop request transaction
    await switchChainIfNotSet(args.from.chainId);
    const feeValue = ethers.parseEther("0.2");
    console.log("Requesting interop...");
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
    if (!signer) throw new Error("No signer available");

    await switchChainIfNotSet(fromChainId);
    console.log("writeContractAsync");

    const totalValue = [...feeCallStarters, ...execCallStarters].reduce(
      (total, item) => total + BigInt(item.requestedInteropCallValue),
      0n,
    );
    const transactionHash = await writeContractAsync({
      chainId: fromChainId,
      abi: INTEROP_CENTER_ABI,
      address: L2_INTEROP_CENTER_ADDRESS,
      functionName: "requestInterop",
      value: totalValue,
      args: [
        BigInt(toChainId.toString(16)),
        L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS,
        feeCallStarters,
        execCallStarters,
        {
          gasLimit: 30000000n,
          gasPerPubdataByteLimit: BigInt(REQUIRED_L2_GAS_PRICE_PER_PUBDATA),
          refundRecipient: account.address,
          paymaster: ethers.ZeroAddress,
          paymasterInput: "0x",
        },
      ],
    });
    /* const interopCenterContract = new zksync.Contract(L2_INTEROP_CENTER_ADDRESS, INTEROP_CENTER_ABI, signer);
    const tx = await interopCenterContract.requestInterop(
      toChainId.toString(16),
      L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS,
      feeCallStarters,
      execCallStarters,
      {
        gasLimit: 30000000n,
        gasPerPubdataByteLimit: REQUIRED_L2_GAS_PRICE_PER_PUBDATA,
        refundRecipient: account.address,
        paymaster: ethers.ZeroAddress,
        paymasterInput: "0x",
      },
      {
        value: totalValue,
      },
    ); */
    console.log("Interop transactionHash", transactionHash);
    const receipt = await waitForTransactionReceipt(wagmiConfig, { chainId: fromChainId, hash: transactionHash });
    return receipt;
  }

  async function getAliasedAddress(chainId: number, address: Address): Promise<Address> {
    return await readContract(wagmiConfig, {
      // chainId: chainId,
      address: L2_INTEROP_HANDLER_ADDRESS,
      abi: [
        {
          type: "function",
          name: "getAliasedAccount",
          inputs: [
            { name: "fromAsSalt", type: "address", internalType: "address" },
            { name: "", type: "uint256", internalType: "uint256" }, // Is this chain id?
          ],
          outputs: [{ name: "", type: "address", internalType: "address" }],
          stateMutability: "view",
        },
      ],
      functionName: "getAliasedAccount",
      args: [getAddress(address.toLowerCase()), 0n], // <- Chain ID? Why does it work with any value right now...
    });
  }

  async function getAliasedAddressCalculated(chainId: number, address: Address): Promise<Address> {
    /* 
    L2_CONTRACT_DEPLOYER.getNewAddressCreate2(
      address(this),
      bytecodeHash,
      keccak256(abi.encode(_sender, _chainId)),
      abi.encode(_sender)
    );
    */

    // await switchChainIfNotSet(chainId);
    address = getAddress(address.toLowerCase());

    // Match constructor encoding: abi.encode(_sender)
    const constructorInput = encodeAbiParameters([{ type: "address" }], [address]);

    // EfficientCall.keccak(_input) — assumed to be keccak256 of the constructor data
    const constructorInputHash = keccak256(constructorInput);

    // Salt: keccak256(abi.encode(_sender, _chainId))
    const salt = keccak256(
      encodeAbiParameters([{ type: "address" }, { type: "uint256" }], [address, BigInt(chainId.toString(16))]),
    );

    const bytecodeHash = await readContract(wagmiConfig, {
      address: L2_INTEROP_HANDLER_ADDRESS,
      abi: [
        {
          inputs: [],
          name: "bytecodeHash",
          outputs: [
            {
              internalType: "bytes32",
              name: "",
              type: "bytes32",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "bytecodeHash",
    });
    return zksync.utils.create2Address(L2_INTEROP_HANDLER_ADDRESS, bytecodeHash, salt, constructorInputHash);
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
