#!/bin/bash
set -euo pipefail

# Load .env file if it exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Set environment variables with defaults if not already set
DEPLOYER_PRIVATE_KEY=${DEPLOYER_PRIVATE_KEY:-""}
CHAIN_A_RPC_URL=${CHAIN_A_RPC_URL:-"http://127.0.0.1:3050"}
CHAIN_B_RPC_URL=${CHAIN_B_RPC_URL:-"http://127.0.0.1:3150"}
CHAIN_C_RPC_URL=${CHAIN_C_RPC_URL:-"http://127.0.0.1:3250"}
# L1_RPC_URL=${L1_RPC_URL:-"http://127.0.0.1:8545"}
# USER_1_CHAIN_A_ADDRESS=$USER_1_CHAIN_A_ADDRESS
# USER_2_CHAIN_B_ADDRESS=$USER_2_CHAIN_B_ADDRESS

# Some constants
DEFAULT_DEPLOYER_PRIVATE_KEY="0x7726827caac94a7f9e1b160f7ea819f172f7b6f9d2a97f992c38edeab82d4110" # Rich local wallet
L2_NATIVE_TOKEN_VAULT_ADDRESS="0x0000000000000000000000000000000000010004"
L2_INTEROP_CENTER_ADDRESS="0x000000000000000000000000000000000001000B"
L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS="0x000000000000000000000000000000000001000F"
L2_ASSET_ROUTER_ADDRESS="0x0000000000000000000000000000000000010003"
REQUIRED_L2_GAS_PRICE_PER_PUBDATA="800"
INTEROP_BROADCASTER_API=${INTEROP_BROADCASTER_API_URL:-"http://127.0.0.1:3030"}

# Validate environment variables
if [ -z "$CHAIN_A_RPC_URL" ]; then
  echo "CHAIN_A_RPC_URL is not set"
  exit 1
fi

if [ -z "$CHAIN_B_RPC_URL" ]; then
  echo "CHAIN_B_RPC_URL is not set"
  exit 1
fi

if [ -z "$CHAIN_C_RPC_URL" ]; then
  echo "CHAIN_C_RPC_URL is not set"
  exit 1
fi

# if [ -z "$USER_1_CHAIN_A_ADDRESS" ]; then
#   echo "USER_1_CHAIN_A_ADDRESS is not set"
#   exit 1
# fi

# if [ -z "$USER_2_CHAIN_B_ADDRESS" ]; then
#   echo "USER_2_CHAIN_B_ADDRESS is not set"
#   exit 1
# fi

extract_deployed_address() {
  # Read input from stdin and extract the address after "Deployed to: "
  grep "Deployed to:" | cut -d' ' -f3
}

get_address_from_private_key() {
  cast wallet address --private-key $1
}

# Function to perform the requestInterop transaction
# Example usage:
# request_interop <FromRpc> <ToRpc> <AssetId> <Amount> <ToAddress> <PrivateKey> <FeeValue>
request_interop() {
  local FromRpc="$1" ToRpc="$2" AssetId="$3" Amount="$4"
  local ToAddr="$5" PrivKey="$6" FeeValue="$7"

  # decimal chain IDs
  local ToChainIdDec
  ToChainIdDec=$(cast chain-id --rpc-url "$ToRpc")

  # hex (unprefixed) and with 0x prefix
  local ToChainIdHexUnp
  ToChainIdHexUnp=$(printf "%x" "$ToChainIdDec")
  local ToChainIdHex="0x$ToChainIdHexUnp"

  # refund address
  local RefundAddr
  RefundAddr=$(cast wallet address "$PrivKey")

  # inner and outer payloads
  local inner outer payload
  inner=$(cast abi-encode "tuple(uint256,address,address)" \
    "$Amount" "$ToAddr" "0x0000000000000000000000000000000000000000")
  outer=$(cast abi-encode "tuple(bytes32,bytes)" \
    "$AssetId" "$inner")
  payload=$(cast concat-hex 0x01 "$outer")

  # starter arrays
  local feeArr execArr
  feeArr="[(true,${L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS},0x,0,${FeeValue})]"
  execArr="[(false,${L2_ASSET_ROUTER_ADDRESS},${payload},0,0)]"

  # params tuple
  local params
  params="(30000000,${REQUIRED_L2_GAS_PRICE_PER_PUBDATA},${RefundAddr},0x0000000000000000000000000000000000000000,0x)"

  # submit
  cast send \
    --rpc-url    "$FromRpc" \
    --private-key "$PrivKey" \
    --value       "$FeeValue" \
    --json \
    "$L2_INTEROP_CENTER_ADDRESS" \
    "requestInterop(uint256,address,(bool,address,bytes,uint256,uint256)[],(bool,address,bytes,uint256,uint256)[],(uint256,uint256,address,address,bytes))" \
    "$ToChainIdHex" \
    "$L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS" \
    "$feeArr" \
    "$execArr" \
    "$params" | jq -r '.transactionHash // empty'
}

wait_for_interop_tx_success() {
  local chain_rpc="$1" tx_hash="$2"
  local chain_id
  chain_id=$(cast chain-id --rpc-url "$chain_rpc")

  echo "⏳ Waiting for tx $tx_hash at chain $chain_id..."

  local polling_interval=15
  local retries=0
  local max_retries=10

  while true; do
    # fetch via query params
    local resp status
    if ! resp=$(curl -sS --get \
      --data-urlencode "transactionHash=${tx_hash}" \
      --data-urlencode "senderChainId=${chain_id}" \
      "${INTEROP_BROADCASTER_API}/api/interop-transaction-status"); then
      echo "❌ curl failed (exit code $?)"
      ((retries++))
      sleep "$polling_interval"
      continue
    fi

    if [[ -z "$resp" ]]; then
      echo "⚠️ Empty response from interop status API"
      ((retries++))
      sleep "$polling_interval"
      continue
    fi

    status=$(echo "$resp" | jq -r '.status // empty')
    echo "📦 Response status: ${status:-<none>}"

    if [[ "$status" == "completed" ]]; then
      echo "✅ Transaction completed successfully!"
      break
    fi

    ((retries++))
    if (( retries >= max_retries )); then
      echo "❌ Giving up after $retries retries (last status: ${status:-none})"
      exit 1
    fi

    echo "⏳ Retrying in $polling_interval seconds... ($retries/$max_retries)"
    sleep "$polling_interval"
  done
}

# Build everything
forge build --zksync

# Check if the deployer private key is set and fund the deployer account if not
if [ -z "$DEPLOYER_PRIVATE_KEY" ]; then
  echo "DEPLOYER_PRIVATE_KEY is not set. Using default rich account..."
  DEPLOYER_PRIVATE_KEY=$DEFAULT_DEPLOYER_PRIVATE_KEY
  DEPLOYER_ADDRESS=$(get_address_from_private_key $DEPLOYER_PRIVATE_KEY)
  echo "Rich account address: $DEPLOYER_ADDRESS"
  echo "Rich account private key: $DEPLOYER_PRIVATE_KEY"
else
  DEPLOYER_ADDRESS=$(get_address_from_private_key $DEPLOYER_PRIVATE_KEY)
  echo "Deployer address: $DEPLOYER_ADDRESS"
fi

# Log deployer balance
deployer_chain_1_balance=$(cast balance --rpc-url $CHAIN_A_RPC_URL $DEPLOYER_ADDRESS)
echo "Deployer Chain A balance: $deployer_chain_1_balance"
deployer_chain_2_balance=$(cast balance --rpc-url $CHAIN_B_RPC_URL $DEPLOYER_ADDRESS)
echo "Deployer Chain B balance: $deployer_chain_2_balance"
deployer_chain_3_balance=$(cast balance --rpc-url $CHAIN_C_RPC_URL $DEPLOYER_ADDRESS)
echo "Deployer Chain C balance: $deployer_chain_3_balance"

# Deploy ERC20 tokens
echo "Deploying ERC20 tokens to Chain A first..."
usdc_address=$(forge create --rpc-url $CHAIN_A_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY --zksync --verifier zksync --zk-gas-per-pubdata "1" src/TestnetERC20Token.sol:TestnetERC20Token --constructor-args "USD Coin" "USDC" 18 | extract_deployed_address)
echo "USDC deployed at: $usdc_address"
ttbill_address=$(forge create --rpc-url $CHAIN_A_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY --zksync --verifier zksync --zk-gas-per-pubdata "1" src/TestnetERC20Token.sol:TestnetERC20Token --constructor-args "Tokenized Treasury Bill" "TTBILL" 18 | extract_deployed_address)
echo "TTBILL deployed at: $ttbill_address"
sgd_address=$(forge create --rpc-url $CHAIN_A_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY --zksync --verifier zksync --zk-gas-per-pubdata "1" src/TestnetERC20Token.sol:TestnetERC20Token --constructor-args "Singapore Dollar" "SGD" 18 | extract_deployed_address)
echo "SGD deployed at: $sgd_address"

# Register tokens in Native Token Vault
echo "Registering tokens in Native Token Vault..."
cast send --rpc-url $CHAIN_A_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY $L2_NATIVE_TOKEN_VAULT_ADDRESS "registerToken(address)" $usdc_address
cast send --rpc-url $CHAIN_A_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY $L2_NATIVE_TOKEN_VAULT_ADDRESS "registerToken(address)" $ttbill_address
cast send --rpc-url $CHAIN_A_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY $L2_NATIVE_TOKEN_VAULT_ADDRESS "registerToken(address)" $sgd_address

# Get token Asset IDs
usdc_asset_id=$(cast call --rpc-url $CHAIN_A_RPC_URL $L2_NATIVE_TOKEN_VAULT_ADDRESS "assetId(address)" $usdc_address)
echo "USDC Asset ID: $usdc_asset_id"
ttbill_asset_id=$(cast call --rpc-url $CHAIN_A_RPC_URL $L2_NATIVE_TOKEN_VAULT_ADDRESS "assetId(address)" $ttbill_address)
echo "TTBILL Asset ID: $ttbill_asset_id"
sgd_asset_id=$(cast call --rpc-url $CHAIN_A_RPC_URL $L2_NATIVE_TOKEN_VAULT_ADDRESS "assetId(address)" $sgd_address)
echo "SGD Asset ID: $sgd_asset_id"


### Mint for Deployer on Chain1
echo "Minting tokens for Deployer on Chain A..."
cast send --rpc-url $CHAIN_A_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY $usdc_address "mint(address,uint256)" $DEPLOYER_ADDRESS 1
cast send --rpc-url $CHAIN_A_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY $ttbill_address "mint(address,uint256)" $DEPLOYER_ADDRESS 1
cast send --rpc-url $CHAIN_A_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY $sgd_address "mint(address,uint256)" $DEPLOYER_ADDRESS 1
### Then interop transfer these funds to User 2 on Chain B
#### 1. Approve tokens for L2_NATIVE_TOKEN_VAULT_ADDRESS address
echo "Approving tokens for L2_NATIVE_TOKEN_VAULT_ADDRESS..."
cast send --rpc-url $CHAIN_A_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY $usdc_address "approve(address,uint256)" $L2_NATIVE_TOKEN_VAULT_ADDRESS 1
cast send --rpc-url $CHAIN_A_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY $ttbill_address "approve(address,uint256)" $L2_NATIVE_TOKEN_VAULT_ADDRESS 1
cast send --rpc-url $CHAIN_A_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY $sgd_address "approve(address,uint256)" $L2_NATIVE_TOKEN_VAULT_ADDRESS 1
#### 2. Request interop transaction with transfer
#### 2.1. Chain B
echo "Requesting interop transfer for Deployer to Chain B"
interop_transfer_usdc_tx_hash_chain_b=$(request_interop $CHAIN_A_RPC_URL $CHAIN_B_RPC_URL $usdc_asset_id 1 $DEPLOYER_ADDRESS $DEPLOYER_PRIVATE_KEY 1000000000000000)
wait_for_interop_tx_success $CHAIN_A_RPC_URL $interop_transfer_usdc_tx_hash_chain_b
interop_transfer_ttbill_tx_hash_chain_b=$(request_interop $CHAIN_A_RPC_URL $CHAIN_B_RPC_URL $ttbill_asset_id 1 $DEPLOYER_ADDRESS $DEPLOYER_PRIVATE_KEY 1000000000000000)
wait_for_interop_tx_success $CHAIN_A_RPC_URL $interop_transfer_ttbill_tx_hash_chain_b
interop_transfer_sgd_tx_hash_chain_b=$(request_interop $CHAIN_A_RPC_URL $CHAIN_B_RPC_URL $sgd_asset_id 1 $DEPLOYER_ADDRESS $DEPLOYER_PRIVATE_KEY 1000000000000000)
wait_for_interop_tx_success $CHAIN_A_RPC_URL $interop_transfer_sgd_tx_hash_chain_b
# This creates address on Chain B for all these tokens
#### 2.2. Chain C
echo "Requesting interop transfer for Deployer to Chain C"
interop_transfer_usdc_tx_hash_chain_c=$(request_interop $CHAIN_A_RPC_URL $CHAIN_C_RPC_URL $usdc_asset_id 1 $DEPLOYER_ADDRESS $DEPLOYER_PRIVATE_KEY 1000000000000000)
wait_for_interop_tx_success $CHAIN_A_RPC_URL $interop_transfer_usdc_tx_hash_chain_c
interop_transfer_ttbill_tx_hash_chain_c=$(request_interop $CHAIN_A_RPC_URL $CHAIN_C_RPC_URL $ttbill_asset_id 1 $DEPLOYER_ADDRESS $DEPLOYER_PRIVATE_KEY 1000000000000000)
wait_for_interop_tx_success $CHAIN_A_RPC_URL $interop_transfer_ttbill_tx_hash_chain_c
interop_transfer_sgd_tx_hash_chain_c=$(request_interop $CHAIN_A_RPC_URL $CHAIN_C_RPC_URL $sgd_asset_id 1 $DEPLOYER_ADDRESS $DEPLOYER_PRIVATE_KEY 1000000000000000)
wait_for_interop_tx_success $CHAIN_A_RPC_URL $interop_transfer_sgd_tx_hash_chain_c
# This creates address on Chain C for all these tokens

## Get addresses of tokens on Chain B
usdc_address_chain_b=$(cast parse-bytes32-address $(cast call --rpc-url $CHAIN_B_RPC_URL $L2_NATIVE_TOKEN_VAULT_ADDRESS "tokenAddress(bytes32)" $usdc_asset_id))
ttbill_address_chain_b=$(cast parse-bytes32-address $(cast call --rpc-url $CHAIN_B_RPC_URL $L2_NATIVE_TOKEN_VAULT_ADDRESS "tokenAddress(bytes32)" $ttbill_asset_id))
sgd_address_chain_b=$(cast parse-bytes32-address $(cast call --rpc-url $CHAIN_B_RPC_URL $L2_NATIVE_TOKEN_VAULT_ADDRESS "tokenAddress(bytes32)" $sgd_asset_id))

## Get addresses of tokens on Chain C
usdc_address_chain_c=$(cast parse-bytes32-address $(cast call --rpc-url $CHAIN_C_RPC_URL $L2_NATIVE_TOKEN_VAULT_ADDRESS "tokenAddress(bytes32)" $usdc_asset_id))
ttbill_address_chain_c=$(cast parse-bytes32-address $(cast call --rpc-url $CHAIN_C_RPC_URL $L2_NATIVE_TOKEN_VAULT_ADDRESS "tokenAddress(bytes32)" $ttbill_asset_id))
sgd_address_chain_c=$(cast parse-bytes32-address $(cast call --rpc-url $CHAIN_C_RPC_URL $L2_NATIVE_TOKEN_VAULT_ADDRESS "tokenAddress(bytes32)" $sgd_asset_id))

# Deploy TradeEscrow contract
echo "Deploying TradeEscrow contract..."
trade_escrow_address=$(forge create --rpc-url $CHAIN_A_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY --zk-gas-per-pubdata "1" src/TradeEscrow.sol:TradeEscrow --constructor-args $DEPLOYER_ADDRESS | extract_deployed_address)
echo "TradeEscrow deployed at: $trade_escrow_address"
cast send --rpc-url $CHAIN_A_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY $trade_escrow_address --value 0.1ether

# Deploy RepoContract
echo "Deploying RepoContract..."
repo_contract_address=$(forge create --rpc-url $CHAIN_A_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY --zk-gas-per-pubdata "1" src/RepoContract.sol:RepoContract --constructor-args $DEPLOYER_ADDRESS | extract_deployed_address)
echo "RepoContract deployed at: $repo_contract_address"
cast send --rpc-url $CHAIN_A_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY $repo_contract_address --value 0.1ether

# Transfer tokens to Chain C for InvoicePayment contract liquidity
echo "Transferring tokens to Chain C for InvoicePayment liquidity..."
# Mint more tokens on Chain A for transfer
cast send --rpc-url $CHAIN_A_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY $usdc_address "mint(address,uint256)" $DEPLOYER_ADDRESS 10000000000000000000000000 # 10,000,000 USDC
cast send --rpc-url $CHAIN_A_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY $ttbill_address "mint(address,uint256)" $DEPLOYER_ADDRESS 10000000000000000000000000 # 10,000,000 TTBILL
cast send --rpc-url $CHAIN_A_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY $sgd_address "mint(address,uint256)" $DEPLOYER_ADDRESS 10000000000000000000000000 # 10,000,000 SGD

# Approve tokens for transfer
cast send --rpc-url $CHAIN_A_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY $usdc_address "approve(address,uint256)" $L2_NATIVE_TOKEN_VAULT_ADDRESS 10000000000000000000000000
cast send --rpc-url $CHAIN_A_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY $ttbill_address "approve(address,uint256)" $L2_NATIVE_TOKEN_VAULT_ADDRESS 10000000000000000000000000
cast send --rpc-url $CHAIN_A_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY $sgd_address "approve(address,uint256)" $L2_NATIVE_TOKEN_VAULT_ADDRESS 10000000000000000000000000

# Deploy InvoicePayment contract on Chain C
echo "Deploying InvoicePayment contract on Chain C..."
invoice_payment_address=$(forge create --rpc-url $CHAIN_C_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY --zksync --zk-gas-per-pubdata "1" src/InvoicePayment.sol:InvoicePayment --constructor-args $DEPLOYER_ADDRESS | extract_deployed_address)
echo "InvoicePayment deployed at: $invoice_payment_address"
cast send --rpc-url $CHAIN_C_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY $invoice_payment_address --value 0.1ether

# Transfer tokens to InvoicePayment at Chain C for liquidity
interop_transfer_usdc_to_c_tx_hash=$(request_interop $CHAIN_A_RPC_URL $CHAIN_C_RPC_URL $usdc_asset_id 10000000000000000000000000 $invoice_payment_address $DEPLOYER_PRIVATE_KEY 1000000000000000)
echo "Transfer USDC to Chain C interop tx hash: $interop_transfer_usdc_to_c_tx_hash"
wait_for_interop_tx_success $CHAIN_A_RPC_URL $interop_transfer_usdc_to_c_tx_hash
interop_transfer_ttbill_to_c_tx_hash=$(request_interop $CHAIN_A_RPC_URL $CHAIN_C_RPC_URL $ttbill_asset_id 10000000000000000000000000 $invoice_payment_address $DEPLOYER_PRIVATE_KEY 1000000000000000)
echo "Transfer TTBILL to Chain C interop tx hash: $interop_transfer_ttbill_to_c_tx_hash"
wait_for_interop_tx_success $CHAIN_A_RPC_URL $interop_transfer_ttbill_to_c_tx_hash
interop_transfer_sgd_to_c_tx_hash=$(request_interop $CHAIN_A_RPC_URL $CHAIN_C_RPC_URL $sgd_asset_id 10000000000000000000000000 $invoice_payment_address $DEPLOYER_PRIVATE_KEY 1000000000000000)
echo "Transfer SGD to Chain C interop tx hash: $interop_transfer_sgd_to_c_tx_hash"
wait_for_interop_tx_success $CHAIN_A_RPC_URL $interop_transfer_sgd_to_c_tx_hash

# Whitelist tokens in InvoicePayment contract on Chain C
echo "Whitelisting tokens in InvoicePayment contract on Chain C..."
cast send --rpc-url $CHAIN_C_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY $invoice_payment_address "whitelistToken(address,string)" $usdc_address_chain_c "USDC"
cast send --rpc-url $CHAIN_C_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY $invoice_payment_address "whitelistToken(address,string)" $ttbill_address_chain_c "TTBILL"
cast send --rpc-url $CHAIN_C_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY $invoice_payment_address "whitelistToken(address,string)" $sgd_address_chain_c "SGD"

# Set exchange rates between tokens on Chain C
echo "Setting exchange rates in InvoicePayment contract on Chain C..."
# 1 SGD = 0.74 USD (1 SGD token = 0.74 USDC tokens)
cast send --rpc-url $CHAIN_C_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY $invoice_payment_address "setExchangeRate(address,address,uint256)" $sgd_address_chain_c $usdc_address_chain_c 740000000000000000
# 1 TTBILL = 1.02 USD (1 TTBILL token = 1.02 USDC tokens)
cast send --rpc-url $CHAIN_C_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY $invoice_payment_address "setExchangeRate(address,address,uint256)" $ttbill_address_chain_c $usdc_address_chain_c 1020000000000000000
# 1 TTBILL = 1.38 SGD (1 TTBILL token = 1.38 SGD tokens)
cast send --rpc-url $CHAIN_C_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY $invoice_payment_address "setExchangeRate(address,address,uint256)" $ttbill_address_chain_c $sgd_address_chain_c 1380000000000000000

echo ""
echo "Accounts:"
echo "Deployer (admin): $DEPLOYER_ADDRESS"
echo ""
echo "Contracts:"
echo "TradeEscrow (Chain A): $trade_escrow_address"
echo "RepoContract (Chain A): $repo_contract_address"
echo "InvoicePayment (Chain C): $invoice_payment_address"
echo ""
echo "Tokens:"
echo "USDC: "
echo "   AssetID - $usdc_asset_id"
echo "   Chain A - $usdc_address"
echo "   Chain B - $usdc_address_chain_b"
echo "   Chain C - $usdc_address_chain_c"
echo "TTBILL: "
echo "   AssetID - $ttbill_asset_id"
echo "   Chain A - $ttbill_address"
echo "   Chain B - $ttbill_address_chain_b"
echo "   Chain C - $ttbill_address_chain_c"
echo "SGD: "
echo "   AssetID - $sgd_asset_id"
echo "   Chain A - $sgd_address"
echo "   Chain B - $sgd_address_chain_b"
echo "   Chain C - $sgd_address_chain_c"
echo ""
echo "Exchange Rates:"
echo "1 SGD = 0.74 USDC"
echo "1 TTBILL = 1.02 USDC"
echo "1 TTBILL = 1.38 SGD"
