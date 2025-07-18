import { repoContracts } from "~~/config/repo-config";

export const REPO_CONTRACT_ABI = [
  {
    type: "constructor",
    inputs: [{ name: "_admin", type: "address", internalType: "address" }],
    stateMutability: "nonpayable",
  },
  { type: "receive", stateMutability: "payable" },
  {
    type: "function",
    name: "acceptOffer",
    inputs: [
      { name: "_offerId", type: "uint256", internalType: "uint256" },
      { name: "_borrowerChainId", type: "uint256", internalType: "uint256" },
      { name: "_borrowerRefundAddress", type: "address", internalType: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "admin",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "cancelOffer",
    inputs: [{ name: "_offerId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimCollateral",
    inputs: [{ name: "_offerId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "calculateRepaymentAmount",
    inputs: [{ name: "_offerId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "totalAmount", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "createOffer",
    inputs: [
      { name: "_lendToken", type: "address", internalType: "address" },
      { name: "_lendAmount", type: "uint256", internalType: "uint256" },
      { name: "_collateralToken", type: "address", internalType: "address" },
      { name: "_collateralAmount", type: "uint256", internalType: "uint256" },
      { name: "_duration", type: "uint256", internalType: "uint256" },
      { name: "_lenderChainId", type: "uint256", internalType: "uint256" },
      { name: "_lenderRefundAddress", type: "address", internalType: "address" },
      { name: "_lenderFee", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "offerId", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "crossChainFee",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getBorrowerOffers",
    inputs: [{ name: "_user", type: "address", internalType: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        internalType: "struct RepoContract.RepoOffer[]",
        components: [
          { name: "offerId", type: "uint256", internalType: "uint256" },
          { name: "lender", type: "address", internalType: "address" },
          { name: "borrower", type: "address", internalType: "address" },
          { name: "lenderRefundAddress", type: "address", internalType: "address" },
          { name: "borrowerRefundAddress", type: "address", internalType: "address" },
          { name: "lenderChainId", type: "uint256", internalType: "uint256" },
          { name: "borrowerChainId", type: "uint256", internalType: "uint256" },
          { name: "lendToken", type: "address", internalType: "address" },
          { name: "lendAmount", type: "uint256", internalType: "uint256" },
          { name: "collateralToken", type: "address", internalType: "address" },
          { name: "collateralAmount", type: "uint256", internalType: "uint256" },
          { name: "duration", type: "uint256", internalType: "uint256" },
          { name: "startTime", type: "uint256", internalType: "uint256" },
          { name: "endTime", type: "uint256", internalType: "uint256" },
          { name: "lenderFee", type: "uint256", internalType: "uint256" },
          { name: "status", type: "uint8", internalType: "enum RepoContract.OfferStatus" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getLenderOffers",
    inputs: [{ name: "_user", type: "address", internalType: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        internalType: "struct RepoContract.RepoOffer[]",
        components: [
          { name: "offerId", type: "uint256", internalType: "uint256" },
          { name: "lender", type: "address", internalType: "address" },
          { name: "borrower", type: "address", internalType: "address" },
          { name: "lenderRefundAddress", type: "address", internalType: "address" },
          { name: "borrowerRefundAddress", type: "address", internalType: "address" },
          { name: "lenderChainId", type: "uint256", internalType: "uint256" },
          { name: "borrowerChainId", type: "uint256", internalType: "uint256" },
          { name: "lendToken", type: "address", internalType: "address" },
          { name: "lendAmount", type: "uint256", internalType: "uint256" },
          { name: "collateralToken", type: "address", internalType: "address" },
          { name: "collateralAmount", type: "uint256", internalType: "uint256" },
          { name: "duration", type: "uint256", internalType: "uint256" },
          { name: "startTime", type: "uint256", internalType: "uint256" },
          { name: "endTime", type: "uint256", internalType: "uint256" },
          { name: "lenderFee", type: "uint256", internalType: "uint256" },
          { name: "status", type: "uint8", internalType: "enum RepoContract.OfferStatus" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getOpenOffers",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        internalType: "struct RepoContract.RepoOffer[]",
        components: [
          { name: "offerId", type: "uint256", internalType: "uint256" },
          { name: "lender", type: "address", internalType: "address" },
          { name: "borrower", type: "address", internalType: "address" },
          { name: "lenderRefundAddress", type: "address", internalType: "address" },
          { name: "borrowerRefundAddress", type: "address", internalType: "address" },
          { name: "lenderChainId", type: "uint256", internalType: "uint256" },
          { name: "borrowerChainId", type: "uint256", internalType: "uint256" },
          { name: "lendToken", type: "address", internalType: "address" },
          { name: "lendAmount", type: "uint256", internalType: "uint256" },
          { name: "collateralToken", type: "address", internalType: "address" },
          { name: "collateralAmount", type: "uint256", internalType: "uint256" },
          { name: "duration", type: "uint256", internalType: "uint256" },
          { name: "startTime", type: "uint256", internalType: "uint256" },
          { name: "endTime", type: "uint256", internalType: "uint256" },
          { name: "lenderFee", type: "uint256", internalType: "uint256" },
          { name: "status", type: "uint8", internalType: "enum RepoContract.OfferStatus" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "gracePeriod",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "offerCounter",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "offers",
    inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "offerId", type: "uint256", internalType: "uint256" },
      { name: "lender", type: "address", internalType: "address" },
      { name: "borrower", type: "address", internalType: "address" },
      { name: "lenderRefundAddress", type: "address", internalType: "address" },
      { name: "borrowerRefundAddress", type: "address", internalType: "address" },
      { name: "lenderChainId", type: "uint256", internalType: "uint256" },
      { name: "borrowerChainId", type: "uint256", internalType: "uint256" },
      { name: "lendToken", type: "address", internalType: "address" },
      { name: "lendAmount", type: "uint256", internalType: "uint256" },
      { name: "collateralToken", type: "address", internalType: "address" },
      { name: "collateralAmount", type: "uint256", internalType: "uint256" },
      { name: "duration", type: "uint256", internalType: "uint256" },
      { name: "startTime", type: "uint256", internalType: "uint256" },
      { name: "endTime", type: "uint256", internalType: "uint256" },
      { name: "lenderFee", type: "uint256", internalType: "uint256" },
      { name: "status", type: "uint8", internalType: "enum RepoContract.OfferStatus" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "repayLoan",
    inputs: [{ name: "_offerId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setAdmin",
    inputs: [{ name: "_newAdmin", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setCrossChainFee",
    inputs: [{ name: "_crossChainFee", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setGracePeriod",
    inputs: [{ name: "_gracePeriod", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "userBorrowerOffers",
    inputs: [
      { name: "", type: "address", internalType: "address" },
      { name: "", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "userLenderOffers",
    inputs: [
      { name: "", type: "address", internalType: "address" },
      { name: "", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  { type: "function", name: "withdraw", inputs: [], outputs: [], stateMutability: "nonpayable" },
  {
    type: "event",
    name: "AdminChanged",
    inputs: [
      { name: "oldAdmin", type: "address", indexed: true, internalType: "address" },
      { name: "newAdmin", type: "address", indexed: true, internalType: "address" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "CollateralClaimed",
    inputs: [{ name: "offerId", type: "uint256", indexed: true, internalType: "uint256" }],
    anonymous: false,
  },
  {
    type: "event",
    name: "CollateralReleased",
    inputs: [{ name: "offerId", type: "uint256", indexed: true, internalType: "uint256" }],
    anonymous: false,
  },
  {
    type: "event",
    name: "CrossChainFeeUpdated",
    inputs: [{ name: "newFee", type: "uint256", indexed: false, internalType: "uint256" }],
    anonymous: false,
  },
  {
    type: "event",
    name: "CrossChainTransferInitiated",
    inputs: [
      { name: "token", type: "address", indexed: false, internalType: "address" },
      { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "recipient", type: "address", indexed: false, internalType: "address" },
      { name: "chainId", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "GracePeriodUpdated",
    inputs: [{ name: "newGracePeriod", type: "uint256", indexed: false, internalType: "uint256" }],
    anonymous: false,
  },
  {
    type: "event",
    name: "LoanRepaid",
    inputs: [{ name: "offerId", type: "uint256", indexed: true, internalType: "uint256" }],
    anonymous: false,
  },
  {
    type: "event",
    name: "OfferAccepted",
    inputs: [
      { name: "offerId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "borrower", type: "address", indexed: true, internalType: "address" },
      { name: "borrowerChainId", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OfferCancelled",
    inputs: [{ name: "offerId", type: "uint256", indexed: true, internalType: "uint256" }],
    anonymous: false,
  },
  {
    type: "event",
    name: "OfferCreated",
    inputs: [
      { name: "offerId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "lender", type: "address", indexed: true, internalType: "address" },
      { name: "lenderChainId", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
] as const;

export const REPO_CONTRACT_ADDRESS = repoContracts.repoContractAddress;
