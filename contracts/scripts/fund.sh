#!/bin/bash
set -euo pipefail

# Load .env file if it exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

usdg_address="0x3731aAe6eD9FFfb5928A9e7084dAA55E506FD060"
waapl_address="0xF259d4Ee301cf69548e40D68ED027F0B5e623460"

# Set environment variables with defaults if not already set
DEPLOYER_PRIVATE_KEY=${DEPLOYER_PRIVATE_KEY:-""}
CHAIN_1_RPC_URL=${CHAIN_1_RPC_URL:-"http://127.0.0.1:3050"}
CHAIN_2_RPC_URL=${CHAIN_2_RPC_URL:-"http://127.0.0.1:3150"}
L1_RPC_URL=${L1_RPC_URL:-"http://127.0.0.1:8545"}
PREMIUM_USER_ADDRESS=$PREMIUM_USER_ADDRESS
BASIC_USER_ADDRESS=$BASIC_USER_ADDRESS

# Some constants
DEFAULT_DEPLOYER_PRIVATE_KEY="0x7726827caac94a7f9e1b160f7ea819f172f7b6f9d2a97f992c38edeab82d4110" # Rich local wallet
L2_NATIVE_TOKEN_VAULT_ADDRESS="0x0000000000000000000000000000000000010004"
L2_INTEROP_CENTER_ADDRESS="0x000000000000000000000000000000000001000A"
L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS="0x000000000000000000000000000000000001000d"
L2_ASSET_ROUTER_ADDRESS="0x0000000000000000000000000000000000010003"
REQUIRED_L2_GAS_PRICE_PER_PUBDATA="800"
INTEROP_BROADCASTER_API="http://127.0.0.1:3030"

# Validate environment variables
if [ -z "$CHAIN_1_RPC_URL" ]; then
  echo "CHAIN_1_RPC_URL is not set"
  exit 1
fi

if [ -z "$PREMIUM_USER_ADDRESS" ]; then
  echo "PREMIUM_USER_ADDRESS is not set"
  exit 1
fi

if [ -z "$BASIC_USER_ADDRESS" ]; then
  echo "BASIC_USER_ADDRESS is not set"
  exit 1
fi

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
    echo "🔄 Polling attempt $((retries + 1))..."

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

if [ -z "$DEPLOYER_PRIVATE_KEY" ]; then
  echo "DEPLOYER_PRIVATE_KEY is not set. Using default rich account..."
  DEPLOYER_PRIVATE_KEY=$DEFAULT_DEPLOYER_PRIVATE_KEY
  DEPLOYER_ADDRESS=$(get_address_from_private_key $DEPLOYER_PRIVATE_KEY)
  echo "Rich account address: $DEPLOYER_ADDRESS"
  echo "Rich account private key: $DEPLOYER_PRIVATE_KEY"

  # Chain1 Min balance 7 ETH
  deployer_chain1_min_balance=7000000000000000000
  deployer_chain1_min_balance_decimal=$(echo "scale=18; $deployer_chain1_min_balance / 1000000000000000000" | bc)
  # Deployer L2 balance
  deployer_chain_1_balance=$(cast balance --rpc-url $CHAIN_1_RPC_URL $DEPLOYER_ADDRESS)
  # If less than min balance, fund the account
  if [ "$deployer_chain_1_balance" -lt "$deployer_chain1_min_balance" ]; then
    echo "Funding deployer L2 balance with $deployer_chain1_min_balance_decimal ETH..."
    npx zksync-cli@latest bridge deposit --amount $deployer_chain1_min_balance_decimal --pk $DEPLOYER_PRIVATE_KEY --to $DEPLOYER_ADDRESS --l1-rpc $L1_RPC_URL --rpc $CHAIN_1_RPC_URL
  fi
else
  DEPLOYER_ADDRESS=$(get_address_from_private_key $DEPLOYER_PRIVATE_KEY)
  echo "Deployer address: $DEPLOYER_ADDRESS"
fi

# Log deployer balance
deployer_chain_1_balance=$(cast balance --rpc-url $CHAIN_1_RPC_URL $DEPLOYER_ADDRESS)
echo "Deployer balance: $deployer_chain_1_balance"

# Get token Asset IDs
usdg_asset_id=$(cast call --rpc-url $CHAIN_1_RPC_URL $L2_NATIVE_TOKEN_VAULT_ADDRESS "assetId(address)" $usdg_address)
waapl_asset_id=$(cast call --rpc-url $CHAIN_1_RPC_URL $L2_NATIVE_TOKEN_VAULT_ADDRESS "assetId(address)" $waapl_address)

# Mint tokens
## Premium User
echo "Minting tokens for Premium user..."
cast send --rpc-url $CHAIN_1_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY $usdg_address "mint(address,uint256)" $PREMIUM_USER_ADDRESS 1000000000000000000 # 1 USDG
cast send --rpc-url $CHAIN_1_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY $PREMIUM_USER_ADDRESS --value 1ether

## Basic User
echo "Minting tokens for Basic user..."
### Mint for Deployer on Chain1
npx zksync-cli@latest bridge deposit --amount "3" --pk $DEPLOYER_PRIVATE_KEY --to $BASIC_USER_ADDRESS --l1-rpc $L1_RPC_URL --rpc $CHAIN_2_RPC_URL
cast send --rpc-url $CHAIN_1_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY $waapl_address "mint(address,uint256)" $DEPLOYER_ADDRESS 5000000000000000000 # 5 wAAPL
### Then interop transfer these funds to Basic user on Chain2
#### 1. Approve tokens for L2_NATIVE_TOKEN_VAULT_ADDRESS address
echo "Approving tokens for L2_NATIVE_TOKEN_VAULT_ADDRESS..."
cast send --rpc-url $CHAIN_1_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY $waapl_address "approve(address,uint256)" $L2_NATIVE_TOKEN_VAULT_ADDRESS 5000000000000000000 # 5 wAAPL
#### 2. Request interop transaction with transfer
echo "Requesting interop transfer for Basic user..."
interop_transfer_wappl_tx_hash=$(request_interop $CHAIN_1_RPC_URL $CHAIN_2_RPC_URL $waapl_asset_id 5000000000000000000 $BASIC_USER_ADDRESS $DEPLOYER_PRIVATE_KEY 200000000000000000)
wait_for_interop_tx_success $CHAIN_1_RPC_URL $interop_transfer_wappl_tx_hash

echo ""
echo "Accounts:"
echo "Chain A: $PREMIUM_USER_ADDRESS"
echo "Chain B: $BASIC_USER_ADDRESS"