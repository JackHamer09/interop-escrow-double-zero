export const INTEROP_HANDLER_ABI = [
  {
    type: "function",
    name: "bundleExecuted",
    inputs: [
      {
        name: "bundleHash",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "bundleExecuted",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "bytecodeHash",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "deployInteropAccount",
    inputs: [
      {
        name: "_sender",
        type: "address",
        internalType: "address",
      },
      {
        name: "_chainId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "executeBundle",
    inputs: [
      {
        name: "_bundle",
        type: "bytes",
        internalType: "bytes",
      },
      {
        name: "_proof",
        type: "tuple",
        internalType: "struct MessageInclusionProof",
        components: [
          {
            name: "chainId",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "l1BatchNumber",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "l2MessageIndex",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "message",
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
            name: "proof",
            type: "bytes32[]",
            internalType: "bytes32[]",
          },
        ],
      },
      {
        name: "_skipEmptyCalldata",
        type: "bool",
        internalType: "bool",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getAliasedAccount",
    inputs: [
      {
        name: "_sender",
        type: "address",
        internalType: "address",
      },
      {
        name: "_chainId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
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
    name: "setInteropAccountBytecode",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "error",
    name: "BundleAlreadyExecuted",
    inputs: [
      {
        name: "bundleHash",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
  },
  {
    type: "error",
    name: "MessageNotIncluded",
    inputs: [],
  },
] as const;
