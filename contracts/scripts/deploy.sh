#!/bin/bash
set -euo pipefail

# Load .env file if it exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Set environment variables with defaults if not already set
DEPLOYER_PRIVATE_KEY=${DEPLOYER_PRIVATE_KEY:-""}
RPC_URL=${RPC_URL:-"http://127.0.0.1:3050"}
L1_RPC_URL=${L1_RPC_URL:-"http://127.0.0.1:8545"}
USER_1_ADDRESS=$USER_1_ADDRESS
USER_2_ADDRESS=$USER_2_ADDRESS

# Some constants
DEFAULT_DEPLOYER_PRIVATE_KEY="0x7726827caac94a7f9e1b160f7ea819f172f7b6f9d2a97f992c38edeab82d4110" # Rich local wallet

# Validate environment variables
if [ -z "$RPC_URL" ]; then
  echo "RPC_URL is not set"
  exit 1
fi

if [ -z "$USER_1_ADDRESS" ]; then
  echo "USER_1_ADDRESS is not set"
  exit 1
fi

if [ -z "$USER_2_ADDRESS" ]; then
  echo "USER_2_ADDRESS is not set"
  exit 1
fi

extract_deployed_address() {
  # Read input from stdin and extract the address after "Deployed to: "
  grep "Deployed to:" | cut -d' ' -f3
}

get_address_from_private_key() {
  cast wallet address --private-key $1
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

  deployer_chain_a_deposit_amount_decimal=1000
  echo "Funding deployer L2 balance with $deployer_chain_a_deposit_amount_decimal ETH..."
  npx zksync-cli@latest bridge deposit --amount $deployer_chain_a_deposit_amount_decimal --pk $DEPLOYER_PRIVATE_KEY --to $DEPLOYER_ADDRESS --l1-rpc $L1_RPC_URL --rpc $RPC_URL
else
  DEPLOYER_ADDRESS=$(get_address_from_private_key $DEPLOYER_PRIVATE_KEY)
  echo "Deployer address: $DEPLOYER_ADDRESS"
fi

# Log deployer balance
deployer_chain_1_balance=$(cast balance --rpc-url $RPC_URL $DEPLOYER_ADDRESS)
echo "Deployer balance: $deployer_chain_1_balance"

# Deploy ERC20 tokens
echo "Deploying ERC20 tokens..."
usdc_address=$(forge create --rpc-url $RPC_URL --private-key $DEPLOYER_PRIVATE_KEY --zksync --zk-gas-per-pubdata "1" src/TestnetERC20Token.sol:TestnetERC20Token --constructor-args "USD Coin" "USDC" 18 | extract_deployed_address)
echo "USDC deployed at: $usdc_address"
ttbill_address=$(forge create --rpc-url $RPC_URL --private-key $DEPLOYER_PRIVATE_KEY --zksync --zk-gas-per-pubdata "1" src/TestnetERC20Token.sol:TestnetERC20Token --constructor-args "Tokenized Treasury Bill" "TTBILL" 18 | extract_deployed_address)
echo "TTBILL deployed at: $ttbill_address"

# Mint tokens
## User 1
echo "Minting tokens for User 1..."
cast send --rpc-url $RPC_URL --private-key $DEPLOYER_PRIVATE_KEY $usdc_address "mint(address,uint256)" $USER_1_ADDRESS 1000000000000000000000000 # 1,000,000 USDC
cast send --rpc-url $RPC_URL --private-key $DEPLOYER_PRIVATE_KEY $ttbill_address "mint(address,uint256)" $USER_1_ADDRESS 10000000000000000000 # 10 TTBILL
cast send --rpc-url $RPC_URL --private-key $DEPLOYER_PRIVATE_KEY $USER_1_ADDRESS --value 100ether

## User 2
echo "Minting tokens for User 2..."
cast send --rpc-url $RPC_URL --private-key $DEPLOYER_PRIVATE_KEY $usdc_address "mint(address,uint256)" $USER_2_ADDRESS 1000000000000000000000000 # 1,000,000 USDC
cast send --rpc-url $RPC_URL --private-key $DEPLOYER_PRIVATE_KEY $ttbill_address "mint(address,uint256)" $USER_2_ADDRESS 10000000000000000000 # 10 TTBILL
cast send --rpc-url $RPC_URL --private-key $DEPLOYER_PRIVATE_KEY $USER_2_ADDRESS --value 100ether

# Deploy TradeEscrow contract
echo "Deploying TradeEscrow contract..."
trade_escrow_address=$(forge create --rpc-url $RPC_URL --private-key $DEPLOYER_PRIVATE_KEY --zksync --zk-gas-per-pubdata "1" src/TradeEscrow.sol:TradeEscrow | extract_deployed_address)
cast send --rpc-url $RPC_URL --private-key $DEPLOYER_PRIVATE_KEY $trade_escrow_address --value 100ether

echo ""
echo "Accounts:"
echo "Deployer: $DEPLOYER_ADDRESS"
echo "User 1: $USER_1_ADDRESS"
echo "User 2: $USER_2_ADDRESS"
echo ""
echo "Contracts:"
echo "TradeEscrow: $trade_escrow_address"
echo ""
echo "Tokens:"
echo "USDC: $usdc_address"
echo "TTBILL: $ttbill_address"
