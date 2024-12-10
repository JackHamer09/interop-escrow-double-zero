# Double Zero Swap

## Summary

Double zero swap is a simple constant product AMM build to be used on top of [Double Zero](https://github.com/Moonsong-Labs/double-zero).

It was built using standard technologies like:

- 🏗 Scaffold-ETH 2: https://scaffoldeth.io/
- Foundry: https://foundry-book.zksync.io/
- wagmi: https://wagmi.sh/
- viem: https://viem.sh/
- react: https://react.dev/
- nextjs: https://nextjs.org/
- rainbowkit: https://www.rainbowkit.com/

## How to start

Even when this was developed with a private validium chain in mind, you can use
this app with any zksync compatible chain following these steps:

### 1. Deploy contracts

In your terminal run:

```
cd contracts
 export PRIVATE_KEY=<deployer_private_keyt> # space at start to avoid sending pk to shell history
env RPC_URL="http://localhost:3050" scripts/deploy.sh
```

This script does several things:
   - Deploys 2 ERC20 tokens
   - Deploys the AMM contract
   - Links everything together
   - Mint some of both tokens and send them to the deploy address.

At the end is going to log something like this:

```
DAI: <dai_address>
WBTC: <wbtc_address>
CPAMM: <cpamm_address>
```

These addresses are going to be used in the next step

### 2. Webapp config

The easiest way to configure the webapp is using a dotenv file

``` bash
cp web/.env.example web/.env
```

Now you can edit that file and put your data:

```
NEXT_PUBLIC_CHAIN_ID="<your_chain_id>"
NEXT_PUBLIC_CPAMM_ADDRESS="<cpamm_address>"
NEXT_PUBLIC_DAI_ADDRESS="<dai_address>"
NEXT_PUBLIC_WBTC_ADDRESS="<weth_address>"
NEXT_PUBLIC_CHAIN_NAME="Local Chain"
NEXT_PUBLIC_BLOCK_EXPLORER_URL="<double_zero_explorer_url>"
```

### 3. Install dependencies and run

Now the app can be launched

``` bash
cd web
pnpm install
pnpm dev
```
