#! /bin/bash

set -e

PRIVATE_KEY=$PRIVATE_KEY
RPC_URL=$RPC_URL

PREMIUM_USER_ADDRESS=$PREMIUM_USER_ADDRESS
BASIC_USER_ADDRESS=$BASIC_USER_ADDRESS

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

# Deploy ERC20 tokens
dai_address=$(forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY --zksync src/TestnetERC20Token.sol:TestnetERC20Token --constructor-args "DAI" "DAI" 18 | extract_deployed_address)
wbtc_address=$(forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY --zksync src/TestnetERC20Token.sol:TestnetERC20Token --constructor-args "WBTC" "WBTC" 18 | extract_deployed_address)

# Mint tokens
## VIP User
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $dai_address "mint(address,uint256)" $DEPLOYER_ADDRESS 1000000000000000000000000 # 1 million DAI
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $wbtc_address "mint(address,uint256)" $DEPLOYER_ADDRESS 100000000000000000000000 # 100,000 WBTC

## Premium User
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $dai_address "mint(address,uint256)" $PREMIUM_USER_ADDRESS 100000000000000000000000 # 100,000 DAI
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $wbtc_address "mint(address,uint256)" $PREMIUM_USER_ADDRESS 10000000000000000000000 # 10,000 WBTC

## Basic User
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $dai_address "mint(address,uint256)" $BASIC_USER_ADDRESS 10000000000000000000000 # 10,000 DAI
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $wbtc_address "mint(address,uint256)" $BASIC_USER_ADDRESS 1000000000000000000000 # 1,000 WBTC

# Deploy CPAMM
cpamm_address=$(forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY --zksync src/CPAMM.sol:CPAMM --constructor-args $dai_address $wbtc_address | extract_deployed_address)

# Set user fee tiers
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $cpamm_address "setUserFeeTier(address,uint256)" $DEPLOYER_ADDRESS 2
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $cpamm_address "setUserFeeTier(address,uint256)" $PREMIUM_USER_ADDRESS 1
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $cpamm_address "setUserFeeTier(address,uint256)" $BASIC_USER_ADDRESS 0

echo "DAI: $dai_address"
echo "WBTC: $wbtc_address"
echo "CPAMM: $cpamm_address"
