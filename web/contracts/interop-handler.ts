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
