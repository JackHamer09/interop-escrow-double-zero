export const INTEROP_CENTER_ABI = [
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
  }
] as const;

export const INTEROP_HANDLER_ABI = [
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
] as const;