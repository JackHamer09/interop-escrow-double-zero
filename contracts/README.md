# RepoContract - Cross-Chain Intraday Repo System

This contract implements a cross-chain intraday repo system that allows users to lend and borrow tokens with collateral for specified durations across different ZKSync chains.

## Features

- Create lending offers with specified tokens, amounts, durations, and chains
- Accept offers by providing collateral
- Repay loans to retrieve collateral
- Claim collateral if loans are not repaid within the duration plus grace period
- Admin-controlled grace period (default 2 minutes)
- Cross-chain token transfers using ZKSync's interop system
- Refund addresses for secure token transfers across chains

## How It Works

1. **Create Offer**: A lender creates an offer specifying the lending token, amount, required collateral token, amount, duration, their chain ID, and refund address.

2. **Accept Offer**: A borrower accepts an offer by providing their chain ID and refund address, then depositing the required collateral. The lending tokens are transferred to the borrower's chain.

3. **Repay Loan**: The borrower repays the loan, and both the collateral and lending tokens are returned to their respective owners on their respective chains.

4. **Claim Collateral**: If the loan is not repaid within the duration plus grace period, the lender can claim the collateral tokens.

## Cross-Chain Functionality

The contract uses ZKSync's interop system to transfer tokens between different chains:

- When a user on Chain A needs to receive tokens on Chain A, but the transaction is initiated on Chain B, the contract uses interop calls to bridge the tokens.
- The contract detects if the recipient is on the same chain as the current contract instance - if so, it uses a regular token transfer; if not, it initiates a cross-chain token transfer.
- Each user provides a refund address on their chain, which is where tokens will be sent.
