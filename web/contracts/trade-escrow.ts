import { env } from "~~/utils/env";

export const TRADE_ESCROW_ABI = [
  {
    type: "function",
    name: "acceptTrade",
    inputs: [{ name: "_tradeId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "cancelTrade",
    inputs: [{ name: "_tradeId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "deposit",
    inputs: [{ name: "_tradeId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getMySwaps",
    inputs: [{ name: "myAddress", type: "address", internalType: "address" }],
    outputs: [
      {
        name: "myTrades",
        type: "tuple[]",
        internalType: "struct TradeEscrow.Trade[]",
        components: [
          { name: "tradeId", type: "uint256", internalType: "uint256" },
          { name: "partyA", type: "address", internalType: "address" },
          { name: "partyB", type: "address", internalType: "address" },
          { name: "tokenA", type: "address", internalType: "address" },
          { name: "amountA", type: "uint256", internalType: "uint256" },
          { name: "tokenB", type: "address", internalType: "address" },
          { name: "amountB", type: "uint256", internalType: "uint256" },
          { name: "depositedA", type: "bool", internalType: "bool" },
          { name: "depositedB", type: "bool", internalType: "bool" },
          { name: "status", type: "uint8", internalType: "enum TradeEscrow.TradeStatus" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "proposeTrade",
    inputs: [
      { name: "_partyB", type: "address", internalType: "address" },
      { name: "_tokenA", type: "address", internalType: "address" },
      { name: "_amountA", type: "uint256", internalType: "uint256" },
      { name: "_tokenB", type: "address", internalType: "address" },
      { name: "_amountB", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "tradeId", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "tradeCounter",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "trades",
    inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "tradeId", type: "uint256", internalType: "uint256" },
      { name: "partyA", type: "address", internalType: "address" },
      { name: "partyB", type: "address", internalType: "address" },
      { name: "tokenA", type: "address", internalType: "address" },
      { name: "amountA", type: "uint256", internalType: "uint256" },
      { name: "tokenB", type: "address", internalType: "address" },
      { name: "amountB", type: "uint256", internalType: "uint256" },
      { name: "depositedA", type: "bool", internalType: "bool" },
      { name: "depositedB", type: "bool", internalType: "bool" },
      { name: "status", type: "uint8", internalType: "enum TradeEscrow.TradeStatus" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "userTrades",
    inputs: [
      { name: "", type: "address", internalType: "address" },
      { name: "", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "DepositMade",
    inputs: [
      { name: "tradeId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "party", type: "address", indexed: true, internalType: "address" },
      { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TradeAccepted",
    inputs: [
      { name: "tradeId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "acceptor", type: "address", indexed: true, internalType: "address" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TradeCancelled",
    inputs: [
      { name: "tradeId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "party", type: "address", indexed: true, internalType: "address" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TradeProposed",
    inputs: [
      { name: "tradeId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "proposer", type: "address", indexed: true, internalType: "address" },
      { name: "counterparty", type: "address", indexed: true, internalType: "address" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TradeSettled",
    inputs: [{ name: "tradeId", type: "uint256", indexed: true, internalType: "uint256" }],
    anonymous: false,
  },
] as const;

export const TRADE_ESCROW_ADDRESS = env.NEXT_PUBLIC_TRADE_ESCROW_ADDRESS;
