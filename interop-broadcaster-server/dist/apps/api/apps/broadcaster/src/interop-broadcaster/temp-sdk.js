"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInteropBundleData = getInteropBundleData;
exports.getInteropTriggerData = getInteropTriggerData;
const ethers = require("ethers");
const zksync = require("zksync-ethers-interop-support");
const constants_1 = require("../../../../libs/common/src/utils/constants");
async function getInteropBundleData(provider, withdrawalHash, index = 0) {
    const response = await tryGetMessageData(provider, withdrawalHash, index);
    if (!response)
        return {
            rawData: null,
            output: null,
            l1BatchNumber: 0,
            l2TxNumberInBlock: 0,
            l2MessageIndex: 0,
            fullProof: "",
        };
    const { message } = response;
    const decodedRequest = ethers.AbiCoder.defaultAbiCoder().decode([constants_1.INTEROP_BUNDLE_ABI], "0x" + message.slice(4));
    const calls = [];
    for (let i = 0; i < decodedRequest[0][1].length; i++) {
        calls.push({
            directCall: decodedRequest[0][1][i][0],
            to: decodedRequest[0][1][i][1],
            from: decodedRequest[0][1][i][2],
            value: decodedRequest[0][1][i][3],
            data: decodedRequest[0][1][i][4],
        });
    }
    const xl2Input = {
        destinationChainId: decodedRequest[0][0],
        calls: calls,
        executionAddress: decodedRequest[0][2],
    };
    const rawData = ethers.AbiCoder.defaultAbiCoder().encode([constants_1.INTEROP_BUNDLE_ABI], [xl2Input]);
    const proofEncoded = ethers.AbiCoder.defaultAbiCoder().encode([constants_1.MESSAGE_INCLUSION_PROOF_ABI], [
        {
            chainId: (await provider.getNetwork()).chainId,
            l1BatchNumber: response.l1BatchNumber,
            l2MessageIndex: response.l2MessageIndex,
            message: [response.l2TxNumberInBlock, constants_1.L2_INTEROP_CENTER_ADDRESS, rawData],
            proof: response.proof,
        },
    ]);
    const output = {
        rawData: rawData,
        output: xl2Input,
        l1BatchNumber: response.l1BatchNumber,
        l2TxNumberInBlock: response.l2TxNumberInBlock,
        l2MessageIndex: response.l2MessageIndex,
        fullProof: proofEncoded,
    };
    return output;
}
async function getInteropTriggerData(provider, withdrawalHash, index = 0) {
    const response = await tryGetMessageData(provider, withdrawalHash, index);
    if (!response)
        return {
            rawData: null,
            output: null,
            l1BatchNumber: 0,
            l2TxNumberInBlock: 0,
            l2MessageIndex: 0,
            fullProof: "",
        };
    const { message } = response;
    const decodedRequest = ethers.AbiCoder.defaultAbiCoder().decode([constants_1.INTEROP_TRIGGER_ABI], "0x" + message.slice(4));
    let trigger = false;
    if (decodedRequest[0][5]) {
        console.log("Trigger", decodedRequest[0][5][1]);
        if (decodedRequest[0][5][1] == BigInt(800)) {
            trigger = true;
        }
    }
    if (!trigger) {
        throw new Error("Trigger is not found");
    }
    const output = {
        destinationChainId: decodedRequest[0][0],
        from: decodedRequest[0][1],
        recipient: decodedRequest[0][2],
        feeBundleHash: decodedRequest[0][3],
        executionBundleHash: decodedRequest[0][4],
        gasFields: {
            gasLimit: decodedRequest[0][5][0],
            gasPerPubdataByteLimit: decodedRequest[0][5][1],
            refundRecipient: decodedRequest[0][5][2],
            paymaster: decodedRequest[0][5][3],
            paymasterInput: decodedRequest[0][5][4],
        },
    };
    const rawData = ethers.AbiCoder.defaultAbiCoder().encode([constants_1.INTEROP_TRIGGER_ABI], [output]);
    const proofEncoded = ethers.AbiCoder.defaultAbiCoder().encode([constants_1.MESSAGE_INCLUSION_PROOF_ABI], [
        {
            chainId: (await provider.getNetwork()).chainId,
            l1BatchNumber: response.l1BatchNumber,
            l2MessageIndex: response.l2MessageIndex,
            message: [response.l2TxNumberInBlock, constants_1.L2_INTEROP_CENTER_ADDRESS, rawData],
            proof: response.proof,
        },
    ]);
    return {
        rawData: rawData,
        output: output,
        l1BatchNumber: response.l1BatchNumber,
        l2TxNumberInBlock: response.l2TxNumberInBlock,
        l2MessageIndex: response.l2MessageIndex,
        fullProof: proofEncoded,
    };
}
async function tryGetMessageData(provider, withdrawalHash, index = 0) {
    let { l1BatchNumber, l2TxNumberInBlock, message, l2MessageIndex, proof } = {
        l1BatchNumber: 0,
        l2TxNumberInBlock: 0,
        message: "",
        l2MessageIndex: 0,
        proof: [""],
    };
    try {
        const sender_chain_utilityWallet = new zksync.Wallet(zksync.Wallet.createRandom().privateKey, provider);
        const gatewayChainId = 506;
        const { l1BatchNumber: l1BatchNumberRead, l2TxNumberInBlock: l2TxNumberInBlockRead, message: messageRead, l2MessageIndex: l2MessageIndexRead, proof: proofRead, } = await sender_chain_utilityWallet.getFinalizeWithdrawalParams(withdrawalHash, index, 0, gatewayChainId);
        l1BatchNumber = l1BatchNumberRead || 0;
        l2TxNumberInBlock = l2TxNumberInBlockRead || 0;
        message = messageRead || "";
        l2MessageIndex = l2MessageIndexRead || 0;
        proof = proofRead || [""];
        if (!message)
            return;
    }
    catch (e) {
        if (e instanceof Error && e.message.includes("undefined is not iterable")) {
            return;
        }
        console.log("Error reading interop message:", e);
        return;
    }
    return { l1BatchNumber, l2TxNumberInBlock, message, l2MessageIndex, proof };
}
//# sourceMappingURL=temp-sdk.js.map