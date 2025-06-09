# RepoContract - Intraday Repo System

This contract implements an on-chain intraday repo system that allows users to lend and borrow tokens with collateral for specified durations.

## Features

- Create lending offers with specified tokens, amounts, and durations
- Accept offers by providing collateral
- Repay loans to retrieve collateral
- Claim collateral if loans are not repaid within the duration plus grace period
- Admin-controlled grace period (default 2 minutes)

## Testing

The project uses Foundry for testing. Follow these steps to run the tests:

### Prerequisites

Ensure you have Foundry installed. If not, install it with:

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Run Tests

Navigate to the contracts directory and run:

```bash
forge test
```

For a specific test file:

```bash
forge test --match-path test/RepoContract.t.sol -vvv
```

For a specific test function:

```bash
forge test --match-test testRepayLoan -vvv
```
