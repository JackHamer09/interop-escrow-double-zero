Prividium Escrow Trade Demo
========================================

This guide walks you through setting up a local escrow trade demo

## Prerequisites

Click each dropdown for instructions:

<details>
  <summary><strong>1. Foundry (zksync-foundry)</strong></summary>

  Install Foundry following the ZKsync documentation:
  - https://docs.zksync.io/zksync-era/tooling/foundry/installation
</details>
<details>
  <summary><strong>2. Start your chain with ZKsync Stack</strong></summary>

  Documentation for starting a local chain with ZKsync Stack:
  - https://docs.zksync.io/zk-stack/prividium/getting-started
</details>

---

## 1. Deploy Escrow and Token Contracts

```bash
# Clone the escrow demo repo
git clone git@github.com:JackHamer09/interop-escrow-double-zero.git
cd interop-escrow-double-zero
git checkout single-chain-demo
git submodule update --init --recursive

# Deploy contracts
cd ./contracts

# Set wallet addresses
# Tokens will be minted to these addresses
export USER_1_ADDRESS=0xYourUser1Address
export USER_2_ADDRESS=0xYourUser2Address
./scripts/deploy.sh
```

After completion, note the contract addresses.

## 2. Configure access for newly deployed contracts

`ZKsync Prividium` provides a private RPC proxy with fine-grained access control.

1. **Configure access for the escrow and token contract**:
  Update `/chains/[your-chain-name]/configs/private-rpc-permissions.yaml` with:
  ```yaml
  contracts:
    # TradeEscrow
    - address: "<update_address_here>"
      methods:
        - signature: function cancelTrade(uint256)
          read:
            type: public
          write:
            type: public
        - signature: function acceptAndDeposit(uint256)
          read:
            type: public
          write:
            type: public
        - signature: function getMySwaps(address)
          read:
            type: checkArgument
            argIndex: 0
          write:
            type: public
        - signature: function proposeTradeAndDeposit(address,uint256,address,uint256,address,uint256)
          read:
            type: public
          write:
            type: public
        - signature: function tradeCounter()
          read:
            type: closed
          write:
            type: closed
        - signature: function trades(uint256)
          read:
            type: closed
          write:
            type: closed
        - signature: function userTrades(address,uint256)
          read:
            type: closed
          write:
            type: closed
    # USDC
    - address: "<update_address_here>"
      methods:
        - signature: function decimals() public view virtual returns (uint8)
          read:
            type: public
          write:
            type: public
        - signature: function mint(address _to, uint256 _amount) public returns (bool)
          read:
            type: public
          write:
            type: public
        - signature: function name() public view virtual returns (string memory)
          read:
            type: public
          write:
            type: public
        - signature: function symbol() public view virtual returns (string memory)
          read:
            type: public
          write:
            type: public
        - signature: totalSupply()
          read:
            type: public
          write:
            type: public
        - signature: "function balanceOf(address) view returns (uint256)"
          read:
            type: checkArgument
            argIndex: 0
          write:
            type: closed
        - signature: "function allowance(address, address) view returns (uint256)"
          read:
            type: oneOf
            rules:
              - type: checkArgument
                argIndex: 0
              - type: checkArgument
                argIndex: 1
          write:
            type: closed
        - signature: function approve(address spender, uint256 value) public returns (bool)
          # This doesn't leek information because we validate that current user
          # is msg.sender.
          read:
            type: public
          write:
            type: public
        - signature: function transferFrom(address from, address to, uint256 value) public virtual returns (bool)
          # This doesn't leek information because we validate that current user
          # is msg.sender.
          read:
            type: public
          write:
            type: public
        - signature: function increaseAllowance(address spender, uint256 addedValue) returns bool
          # This doesn't leek information because we validate that current user
          # is msg.sender.
          read:
            type: public
          write:
            type: public
        - signature: function decreaseAllowance(address spender, uint256 addedValue) returns bool
          # This doesn't leek information because we validate that current user
          # is msg.sender.
          read:
            type: public
          write:
            type: public
        - signature: authorizedBalanceOf(address)(uint256)
          read:
            type: public
          write:
            type: public
        - signature: function puclicThreshold(address target) public view returns (uint256, bool)
          read:
            type: public
          write:
            type: closed
        - signature: function changePublicThreshold(uint256 publicThreshold) external
          read:
            type: public
          write:
            type: public
        - signature: function supportsInterface(bytes4) view
          read:
            type: public
          write:
            type: public
    # TTBILL
    - address: "<update_address_here>"
      methods:
        - signature: function decimals() public view virtual returns (uint8)
          read:
            type: public
          write:
            type: public
        - signature: function mint(address _to, uint256 _amount) public returns (bool)
          read:
            type: public
          write:
            type: public
        - signature: function name() public view virtual returns (string memory)
          read:
            type: public
          write:
            type: public
        - signature: function symbol() public view virtual returns (string memory)
          read:
            type: public
          write:
            type: public
        - signature: totalSupply()
          read:
            type: public
          write:
            type: public
        - signature: "function balanceOf(address) view returns (uint256)"
          read:
            type: checkArgument
            argIndex: 0
          write:
            type: closed
        - signature: "function allowance(address, address) view returns (uint256)"
          read:
            type: oneOf
            rules:
              - type: checkArgument
                argIndex: 0
              - type: checkArgument
                argIndex: 1
          write:
            type: closed
        - signature: function approve(address spender, uint256 value) public returns (bool)
          # This doesn't leek information because we validate that current user
          # is msg.sender.
          read:
            type: public
          write:
            type: public
        - signature: function transferFrom(address from, address to, uint256 value) public virtual returns (bool)
          # This doesn't leek information because we validate that current user
          # is msg.sender.
          read:
            type: public
          write:
            type: public
        - signature: function increaseAllowance(address spender, uint256 addedValue) returns bool
          # This doesn't leek information because we validate that current user
          # is msg.sender.
          read:
            type: public
          write:
            type: public
        - signature: function decreaseAllowance(address spender, uint256 addedValue) returns bool
          # This doesn't leek information because we validate that current user
          # is msg.sender.
          read:
            type: public
          write:
            type: public
        - signature: authorizedBalanceOf(address)(uint256)
          read:
            type: public
          write:
            type: public
        - signature: function puclicThreshold(address target) public view returns (uint256, bool)
          read:
            type: public
          write:
            type: closed
        - signature: function changePublicThreshold(uint256 publicThreshold) external
          read:
            type: public
          write:
            type: public
        - signature: function supportsInterface(bytes4) view
          read:
            type: public
          write:
            type: public
  ```

2. **Restart ZKsync Prividium services**
  ???

## 3. Run the Escrow Trade Demo App

Back to `interop-escrow-double-zero` repo:
```bash
cd web
cp .env.example .env
# Populate .env with your contract addresses

pnpm install
pnpm dev
```

Now open the Escrow Trade app: http://localhost:3000

---

## Troubleshooting

### Port Conflicts

This setup launches many services on different ports. If you see an error about a busy port:
```bash
# Replace 3010 with the conflicting port
lsof -i :3010
kill -9 <PID>
```
Then re-run the affected launch script.

### Browser Wallet Extensions

Ensure **only MetaMask** is enabled in your browser. Disable other wallet extensions (e.g., Coinbase Wallet, WalletConnect) to avoid conflicts when connecting to private RPCs.
