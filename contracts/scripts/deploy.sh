#! /bin/bash

set -e

PRIVATE_KEY=$PRIVATE_KEY
RPC_URL=$RPC_URL

# Validate environment variables
if [ -z "$PRIVATE_KEY" ]; then
  echo "PRIVATE_KEY is not set"
  exit 1
fi

if [ -z "$RPC_URL" ]; then
  echo "RPC_URL is not set"
  exit 1
fi

extract_deployed_address() {
    # Read input from stdin and extract the address after "Deployed to: "
    grep "Deployed to:" | cut -d' ' -f3
}

get_address_from_private_key() {
    cast wallet address --private-key $1
}

DEPLOYER_ADDRESS=$(get_address_from_private_key $PRIVATE_KEY)

# Build everything
forge build --zksync

# Deploy ERC20 tokens
dai_address=$(forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY --zksync contracts/TestnetERC20Token.sol:TestnetERC20Token --constructor-args "DAI" "DAI" 18 | extract_deployed_address)
wbtc_address=$(forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY --zksync contracts/TestnetERC20Token.sol:TestnetERC20Token --constructor-args "WBTC" "WBTC" 18 | extract_deployed_address)

# Mint tokens
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $dai_address "mint(address,uint256)" $DEPLOYER_ADDRESS 1000000000000000000000000 # 1 million DAI
cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY $wbtc_address "mint(address,uint256)" $DEPLOYER_ADDRESS 100000000000000000000000 # 100,000 WBTC

# Deploy CPAMM
cpamm_address=$(forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY --zksync contracts/CPAMM.sol:CPAMM --constructor-args $dai_address $wbtc_address | extract_deployed_address)

echo "DAI: $dai_address"
echo "WBTC: $wbtc_address"
echo "CPAMM: $cpamm_address"
