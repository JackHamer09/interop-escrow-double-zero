"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MESSAGE_INCLUSION_PROOF_ABI = exports.INTEROP_TRIGGER_ABI = exports.INTEROP_BUNDLE_ABI = exports.L2_INTEROP_CENTER_ADDRESS = exports.L2_INTEROP_HANDLER_ADDRESS = exports.L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS = exports.L2_NATIVE_TOKEN_VAULT_ADDRESS = exports.L2_ASSET_ROUTER_ADDRESS = exports.REQUIRED_L2_GAS_PRICE_PER_PUBDATA = void 0;
exports.REQUIRED_L2_GAS_PRICE_PER_PUBDATA = 800;
exports.L2_ASSET_ROUTER_ADDRESS = "0x0000000000000000000000000000000000010003";
exports.L2_NATIVE_TOKEN_VAULT_ADDRESS = "0x0000000000000000000000000000000000010004";
exports.L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS = "0x000000000000000000000000000000000001000d";
exports.L2_INTEROP_HANDLER_ADDRESS = "0x000000000000000000000000000000000001000B";
exports.L2_INTEROP_CENTER_ADDRESS = "0x000000000000000000000000000000000001000A";
exports.INTEROP_BUNDLE_ABI = "tuple(uint256 destinationChainId, tuple(bool directCall, address to, address from, uint256 value, bytes data)[] calls, address executionAddress)";
exports.INTEROP_TRIGGER_ABI = "tuple(uint256 destinationChainId, address from, address recipient,bytes32 feeBundleHash, bytes32 executionBundleHash, tuple(uint256 gasLimit, uint256 gasPerPubdataByteLimit, address refundRecipient, address paymaster, bytes paymasterInput) gasFields)";
exports.MESSAGE_INCLUSION_PROOF_ABI = "tuple(uint256 chainId, uint256 l1BatchNumber, uint256 l2MessageIndex, tuple(uint16 txNumberInBatch, address sender, bytes data) message, bytes32[] proof)";
//# sourceMappingURL=constants.js.map