#! /bin/bash

set -e

PRIVATE_KEY=$PRIVATE_KEY
RPC_URL=$RPC_URL

PREMIUM_USER_ADDRESS=$PREMIUM_USER_ADDRESS
BASIC_USER_ADDRESS=$BASIC_USER_ADDRESS

L2_NATIVE_TOKEN_VAULT_ADDRESS="0x0000000000000000000000000000000000010004"

# Validate environment variables
if [ -z "$PRIVATE_KEY" ]; then
  echo "PRIVATE_KEY is not set"
  exit 1
fi

if [ -z "$RPC_URL" ]; then
  echo "RPC_URL is not set"
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

# List of users. The deployer is the VIP user.
DEPLOYER_ADDRESS=$(get_address_from_private_key $PRIVATE_KEY)

# Build everything
forge build --zksync

# Log deployer balance
deployer_balance=$(cast balance --rpc-url $RPC_URL $DEPLOYER_ADDRESS)
echo "Deployer balance ($DEPLOYER_ADDRESS): $deployer_balance"

# Deploy ERC20 tokens
echo "Deploying ERC20 tokens..."
dai_address=$(forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY --zksync src/TestnetERC20Token.sol:TestnetERC20Token --constructor-args "DAI" "DAI" 18 | extract_deployed_address)
wbtc_address=$(forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY --zksync src/TestnetERC20Token.sol:TestnetERC20Token --constructor-args "WBTC" "WBTC" 18 | extract_deployed_address)
usdg_address=$(forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY --zksync src/TestnetERC20Token.sol:TestnetERC20Token --constructor-args "Global Dollar" "USDG" 18 | extract_deployed_address)
waapl_address=$(forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY --zksync src/TestnetERC20Token.sol:TestnetERC20Token --constructor-args "Wrapped AAPL" "wAAPL" 18 | extract_deployed_address)

# Register tokens in Native Token Vault
echo "Registering tokens in Native Token Vault..."
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $L2_NATIVE_TOKEN_VAULT_ADDRESS "registerToken(address)" $dai_address
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $L2_NATIVE_TOKEN_VAULT_ADDRESS "registerToken(address)" $wbtc_address
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $L2_NATIVE_TOKEN_VAULT_ADDRESS "registerToken(address)" $usdg_address
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $L2_NATIVE_TOKEN_VAULT_ADDRESS "registerToken(address)" $waapl_address

# Get token Asset IDs
dai_asset_id=$(cast call --rpc-url $RPC_URL $L2_NATIVE_TOKEN_VAULT_ADDRESS "assetId(address)" $dai_address)
wbtc_asset_id=$(cast call --rpc-url $RPC_URL $L2_NATIVE_TOKEN_VAULT_ADDRESS "assetId(address)" $wbtc_address)
usdg_asset_id=$(cast call --rpc-url $RPC_URL $L2_NATIVE_TOKEN_VAULT_ADDRESS "assetId(address)" $usdg_address)
waapl_asset_id=$(cast call --rpc-url $RPC_URL $L2_NATIVE_TOKEN_VAULT_ADDRESS "assetId(address)" $waapl_address)

# Mint tokens
## VIP User
echo "Minting tokens for VIP user..."
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $dai_address "mint(address,uint256)" $DEPLOYER_ADDRESS 1000000000000000000000000 # 1 million DAI
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $wbtc_address "mint(address,uint256)" $DEPLOYER_ADDRESS 100000000000000000000000 # 100,000 WBTC
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $usdg_address "mint(address,uint256)" $DEPLOYER_ADDRESS 1000000000000000000000000 # 1,000,000 USDG
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $waapl_address "mint(address,uint256)" $DEPLOYER_ADDRESS 1000000000000000000000 # 1,000 wAAPL

## Premium User
echo "Minting tokens for Premium user..."
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $dai_address "mint(address,uint256)" $PREMIUM_USER_ADDRESS 100000000000000000000000 # 100,000 DAI
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $wbtc_address "mint(address,uint256)" $PREMIUM_USER_ADDRESS 10000000000000000000000 # 10,000 WBTC
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $usdg_address "mint(address,uint256)" $PREMIUM_USER_ADDRESS 1000000000000000000000000 # 1,000,000 USDG
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $waapl_address "mint(address,uint256)" $PREMIUM_USER_ADDRESS 10000000000000000000 # 10 wAAPL
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $PREMIUM_USER_ADDRESS --value 1ether # 1 ETH

## Basic User
echo "Minting tokens for Basic user..."
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $dai_address "mint(address,uint256)" $BASIC_USER_ADDRESS 10000000000000000000000 # 10,000 DAI
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $wbtc_address "mint(address,uint256)" $BASIC_USER_ADDRESS 1000000000000000000000 # 1,000 WBTC
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $usdg_address "mint(address,uint256)" $BASIC_USER_ADDRESS 100000000000000000000000 # 100,000 USDG
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $waapl_address "mint(address,uint256)" $BASIC_USER_ADDRESS 100000000000000000000 # 100 wAAPL
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $BASIC_USER_ADDRESS --value 1ether # 1 ETH

# Deploy CPAMM
echo "Deploying CPAMM..."
cpamm_address=$(forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY --zksync src/CPAMM.sol:CPAMM --constructor-args $dai_address $wbtc_address | extract_deployed_address)

# Set user fee tiers
echo "Setting user fee tiers..."
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $cpamm_address "setUserFeeTier(address,uint256)" $DEPLOYER_ADDRESS 2
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $cpamm_address "setUserFeeTier(address,uint256)" $PREMIUM_USER_ADDRESS 1
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $cpamm_address "setUserFeeTier(address,uint256)" $BASIC_USER_ADDRESS 0

# Deploy TradeEscrow
echo "Deploying TradeEscrow..."
trade_escrow_address=$(forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY --zksync src/TradeEscrow.sol:TradeEscrow | extract_deployed_address)

echo "DAI: $dai_address ($dai_asset_id)"
echo "WBTC: $wbtc_address ($wbtc_asset_id)"
echo "USDG: $usdg_address ($usdg_asset_id)"
echo "wAAPL: $waapl_address ($waapl_asset_id)"
echo "CPAMM: $cpamm_address"
echo "TradeEscrow.sol: $trade_escrow_address"
