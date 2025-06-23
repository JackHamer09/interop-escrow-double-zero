export const INTEROP_CENTER_ABI = [
  {
    type: "constructor",
    inputs: [
      {
        name: "_bridgehub",
        type: "address",
        internalType: "contract IBridgehub",
      },
      {
        name: "_l1ChainId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_owner",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "BRIDGE_HUB",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract IBridgehub",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "L1_CHAIN_ID",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "_startBundle",
    inputs: [
      {
        name: "_destinationChainId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_sender",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "bundleId",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "acceptOwnership",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "addCallToBundle",
    inputs: [
      {
        name: "_bundleId",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "_interopCallRequest",
        type: "tuple",
        internalType: "struct InteropCallRequest",
        components: [
          {
            name: "to",
            type: "address",
            internalType: "address",
          },
          {
            name: "value",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "data",
            type: "bytes",
            internalType: "bytes",
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "addCallToBundleFromRequest",
    inputs: [
      {
        name: "_bundleId",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "_value",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_request",
        type: "tuple",
        internalType: "struct L2TransactionRequestTwoBridgesInner",
        components: [
          {
            name: "magicValue",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "l2Contract",
            type: "address",
            internalType: "address",
          },
          {
            name: "l2Calldata",
            type: "bytes",
            internalType: "bytes",
          },
          {
            name: "factoryDeps",
            type: "bytes[]",
            internalType: "bytes[]",
          },
          {
            name: "txDataHash",
            type: "bytes32",
            internalType: "bytes32",
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "assetRouter",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "assetTracker",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract IAssetTracker",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "bundleCount",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "finishAndSendBundle",
    inputs: [
      {
        name: "_bundleId",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "_executionAddress",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "interopBundleHash",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "forwardTransactionOnGatewayWithBalanceChange",
    inputs: [
      {
        name: "_chainId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_canonicalTxHash",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "_expirationTimestamp",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "_baseTokenAmount",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_assetId",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "_amount",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "initialize",
    inputs: [
      {
        name: "_owner",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "l2TransactionBaseCost",
    inputs: [
      {
        name: "_chainId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_gasPrice",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_l2GasLimit",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_l2GasPerPubdataByteLimit",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pause",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "paused",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pendingOwner",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "proveL1ToL2TransactionStatus",
    inputs: [
      {
        name: "_chainId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_l2TxHash",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "_l2BatchNumber",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_l2MessageIndex",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_l2TxNumberInBatch",
        type: "uint16",
        internalType: "uint16",
      },
      {
        name: "_merkleProof",
        type: "bytes32[]",
        internalType: "bytes32[]",
      },
      {
        name: "_status",
        type: "uint8",
        internalType: "enum TxStatus",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "proveL2LogInclusion",
    inputs: [
      {
        name: "_chainId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_batchNumber",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_index",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_log",
        type: "tuple",
        internalType: "struct L2Log",
        components: [
          {
            name: "l2ShardId",
            type: "uint8",
            internalType: "uint8",
          },
          {
            name: "isService",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "txNumberInBatch",
            type: "uint16",
            internalType: "uint16",
          },
          {
            name: "sender",
            type: "address",
            internalType: "address",
          },
          {
            name: "key",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "value",
            type: "bytes32",
            internalType: "bytes32",
          },
        ],
      },
      {
        name: "_proof",
        type: "bytes32[]",
        internalType: "bytes32[]",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "proveL2MessageInclusion",
    inputs: [
      {
        name: "_chainId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_batchNumber",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_index",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_message",
        type: "tuple",
        internalType: "struct L2Message",
        components: [
          {
            name: "txNumberInBatch",
            type: "uint16",
            internalType: "uint16",
          },
          {
            name: "sender",
            type: "address",
            internalType: "address",
          },
          {
            name: "data",
            type: "bytes",
            internalType: "bytes",
          },
        ],
      },
      {
        name: "_proof",
        type: "bytes32[]",
        internalType: "bytes32[]",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "renounceOwnership",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "requestInterop",
    inputs: [
      {
        name: "_destinationChainId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_executionAddress",
        type: "address",
        internalType: "address",
      },
      {
        name: "_feePaymentCallStarters",
        type: "tuple[]",
        internalType: "struct InteropCallStarter[]",
        components: [
          {
            name: "directCall",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "nextContract",
            type: "address",
            internalType: "address",
          },
          {
            name: "data",
            type: "bytes",
            internalType: "bytes",
          },
          {
            name: "value",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "requestedInteropCallValue",
            type: "uint256",
            internalType: "uint256",
          },
        ],
      },
      {
        name: "_executionCallStarters",
        type: "tuple[]",
        internalType: "struct InteropCallStarter[]",
        components: [
          {
            name: "directCall",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "nextContract",
            type: "address",
            internalType: "address",
          },
          {
            name: "data",
            type: "bytes",
            internalType: "bytes",
          },
          {
            name: "value",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "requestedInteropCallValue",
            type: "uint256",
            internalType: "uint256",
          },
        ],
      },
      {
        name: "_gasFields",
        type: "tuple",
        internalType: "struct GasFields",
        components: [
          {
            name: "gasLimit",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "gasPerPubdataByteLimit",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "refundRecipient",
            type: "address",
            internalType: "address",
          },
          {
            name: "paymaster",
            type: "address",
            internalType: "address",
          },
          {
            name: "paymasterInput",
            type: "bytes",
            internalType: "bytes",
          },
        ],
      },
    ],
    outputs: [
      {
        name: "canonicalTxHash",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "requestInteropSingleCall",
    inputs: [
      {
        name: "_request",
        type: "tuple",
        internalType: "struct L2TransactionRequestTwoBridgesOuter",
        components: [
          {
            name: "chainId",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "mintValue",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "l2Value",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "l2GasLimit",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "l2GasPerPubdataByteLimit",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "refundRecipient",
            type: "address",
            internalType: "address",
          },
          {
            name: "secondBridgeAddress",
            type: "address",
            internalType: "address",
          },
          {
            name: "secondBridgeValue",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "secondBridgeCalldata",
            type: "bytes",
            internalType: "bytes",
          },
        ],
      },
    ],
    outputs: [
      {
        name: "canonicalTxHash",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "requestInteropSingleDirectCall",
    inputs: [
      {
        name: "_request",
        type: "tuple",
        internalType: "struct L2TransactionRequestDirect",
        components: [
          {
            name: "chainId",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "mintValue",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "l2Contract",
            type: "address",
            internalType: "address",
          },
          {
            name: "l2Value",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "l2Calldata",
            type: "bytes",
            internalType: "bytes",
          },
          {
            name: "l2GasLimit",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "l2GasPerPubdataByteLimit",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "factoryDeps",
            type: "bytes[]",
            internalType: "bytes[]",
          },
          {
            name: "refundRecipient",
            type: "address",
            internalType: "address",
          },
        ],
      },
    ],
    outputs: [
      {
        name: "canonicalTxHash",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "requestL2TransactionDirect",
    inputs: [
      {
        name: "_request",
        type: "tuple",
        internalType: "struct L2TransactionRequestDirect",
        components: [
          {
            name: "chainId",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "mintValue",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "l2Contract",
            type: "address",
            internalType: "address",
          },
          {
            name: "l2Value",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "l2Calldata",
            type: "bytes",
            internalType: "bytes",
          },
          {
            name: "l2GasLimit",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "l2GasPerPubdataByteLimit",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "factoryDeps",
            type: "bytes[]",
            internalType: "bytes[]",
          },
          {
            name: "refundRecipient",
            type: "address",
            internalType: "address",
          },
        ],
      },
    ],
    outputs: [
      {
        name: "canonicalTxHash",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "requestL2TransactionDirectSender",
    inputs: [
      {
        name: "_sender",
        type: "address",
        internalType: "address",
      },
      {
        name: "_request",
        type: "tuple",
        internalType: "struct L2TransactionRequestDirect",
        components: [
          {
            name: "chainId",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "mintValue",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "l2Contract",
            type: "address",
            internalType: "address",
          },
          {
            name: "l2Value",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "l2Calldata",
            type: "bytes",
            internalType: "bytes",
          },
          {
            name: "l2GasLimit",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "l2GasPerPubdataByteLimit",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "factoryDeps",
            type: "bytes[]",
            internalType: "bytes[]",
          },
          {
            name: "refundRecipient",
            type: "address",
            internalType: "address",
          },
        ],
      },
    ],
    outputs: [
      {
        name: "canonicalTxHash",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "requestL2TransactionTwoBridges",
    inputs: [
      {
        name: "_request",
        type: "tuple",
        internalType: "struct L2TransactionRequestTwoBridgesOuter",
        components: [
          {
            name: "chainId",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "mintValue",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "l2Value",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "l2GasLimit",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "l2GasPerPubdataByteLimit",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "refundRecipient",
            type: "address",
            internalType: "address",
          },
          {
            name: "secondBridgeAddress",
            type: "address",
            internalType: "address",
          },
          {
            name: "secondBridgeValue",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "secondBridgeCalldata",
            type: "bytes",
            internalType: "bytes",
          },
        ],
      },
    ],
    outputs: [
      {
        name: "canonicalTxHash",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "requestL2TransactionTwoBridgesSender",
    inputs: [
      {
        name: "_sender",
        type: "address",
        internalType: "address",
      },
      {
        name: "_request",
        type: "tuple",
        internalType: "struct L2TransactionRequestTwoBridgesOuter",
        components: [
          {
            name: "chainId",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "mintValue",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "l2Value",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "l2GasLimit",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "l2GasPerPubdataByteLimit",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "refundRecipient",
            type: "address",
            internalType: "address",
          },
          {
            name: "secondBridgeAddress",
            type: "address",
            internalType: "address",
          },
          {
            name: "secondBridgeValue",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "secondBridgeCalldata",
            type: "bytes",
            internalType: "bytes",
          },
        ],
      },
    ],
    outputs: [
      {
        name: "canonicalTxHash",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "sendCall",
    inputs: [
      {
        name: "_destinationChainId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_destinationAddress",
        type: "address",
        internalType: "address",
      },
      {
        name: "_data",
        type: "bytes",
        internalType: "bytes",
      },
      {
        name: "_value",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "sendInteropTrigger",
    inputs: [
      {
        name: "_interopTrigger",
        type: "tuple",
        internalType: "struct InteropTrigger",
        components: [
          {
            name: "destinationChainId",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "sender",
            type: "address",
            internalType: "address",
          },
          {
            name: "recipient",
            type: "address",
            internalType: "address",
          },
          {
            name: "feeBundleHash",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "executionBundleHash",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "gasFields",
            type: "tuple",
            internalType: "struct GasFields",
            components: [
              {
                name: "gasLimit",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "gasPerPubdataByteLimit",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "refundRecipient",
                type: "address",
                internalType: "address",
              },
              {
                name: "paymaster",
                type: "address",
                internalType: "address",
              },
              {
                name: "paymasterInput",
                type: "bytes",
                internalType: "bytes",
              },
            ],
          },
        ],
      },
    ],
    outputs: [
      {
        name: "canonicalTxHash",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "sendMessage",
    inputs: [
      {
        name: "_msg",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [
      {
        name: "canonicalTxHash",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setAddresses",
    inputs: [
      {
        name: "_assetRouter",
        type: "address",
        internalType: "address",
      },
      {
        name: "_assetTracker",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "startBundle",
    inputs: [
      {
        name: "_destinationChainId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "bundleId",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [
      {
        name: "newOwner",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "unpause",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "Initialized",
    inputs: [
      {
        name: "version",
        type: "uint8",
        indexed: false,
        internalType: "uint8",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "InteropBundleSent",
    inputs: [
      {
        name: "l2l1TxHash",
        type: "bytes32",
        indexed: false,
        internalType: "bytes32",
      },
      {
        name: "interopBundleHash",
        type: "bytes32",
        indexed: false,
        internalType: "bytes32",
      },
      {
        name: "interopBundle",
        type: "tuple",
        indexed: false,
        internalType: "struct InteropBundle",
        components: [
          {
            name: "destinationChainId",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "calls",
            type: "tuple[]",
            internalType: "struct InteropCall[]",
            components: [
              {
                name: "directCall",
                type: "bool",
                internalType: "bool",
              },
              {
                name: "to",
                type: "address",
                internalType: "address",
              },
              {
                name: "from",
                type: "address",
                internalType: "address",
              },
              {
                name: "value",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "data",
                type: "bytes",
                internalType: "bytes",
              },
            ],
          },
          {
            name: "executionAddress",
            type: "address",
            internalType: "address",
          },
        ],
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "InteropTriggerSent",
    inputs: [
      {
        name: "l2l11TxHash",
        type: "bytes32",
        indexed: false,
        internalType: "bytes32",
      },
      {
        name: "_interopTrigger",
        type: "tuple",
        indexed: false,
        internalType: "struct InteropTrigger",
        components: [
          {
            name: "destinationChainId",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "sender",
            type: "address",
            internalType: "address",
          },
          {
            name: "recipient",
            type: "address",
            internalType: "address",
          },
          {
            name: "feeBundleHash",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "executionBundleHash",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "gasFields",
            type: "tuple",
            internalType: "struct GasFields",
            components: [
              {
                name: "gasLimit",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "gasPerPubdataByteLimit",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "refundRecipient",
                type: "address",
                internalType: "address",
              },
              {
                name: "paymaster",
                type: "address",
                internalType: "address",
              },
              {
                name: "paymasterInput",
                type: "bytes",
                internalType: "bytes",
              },
            ],
          },
        ],
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OwnershipTransferStarted",
    inputs: [
      {
        name: "previousOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      {
        name: "previousOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Paused",
    inputs: [
      {
        name: "account",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Unpaused",
    inputs: [
      {
        name: "account",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "error",
    name: "ChainIdNotRegistered",
    inputs: [
      {
        name: "chainId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "DirectCallNonEmptyValue",
    inputs: [
      {
        name: "nextContract",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "MsgValueMismatch",
    inputs: [
      {
        name: "expectedMsgValue",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "providedMsgValue",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "NotInGatewayMode",
    inputs: [],
  },
  {
    type: "error",
    name: "NotInitializedReentrancyGuard",
    inputs: [],
  },
  {
    type: "error",
    name: "Reentrancy",
    inputs: [],
  },
  {
    type: "error",
    name: "SecondBridgeAddressTooLow",
    inputs: [
      {
        name: "secondBridgeAddress",
        type: "address",
        internalType: "address",
      },
      {
        name: "minSecondBridgeAddress",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "SlotOccupied",
    inputs: [],
  },
  {
    type: "error",
    name: "Unauthorized",
    inputs: [
      {
        name: "caller",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "WrongMagicValue",
    inputs: [
      {
        name: "expectedMagicValue",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "providedMagicValue",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
] as const;
