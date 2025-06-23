// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IInteropCenter} from "era-contracts/l1-contracts/contracts/bridgehub/IInteropCenter.sol";
import {IInteropHandler} from "era-contracts/l1-contracts/contracts/bridgehub/IInteropHandler.sol";
import {L2_INTEROP_CENTER, L2_STANDARD_TRIGGER_ACCOUNT_ADDR, L2_INTEROP_HANDLER} from "era-contracts/system-contracts/contracts/Constants.sol";
import {InteropCallStarter, GasFields} from "era-contracts/l1-contracts/contracts/common/Messaging.sol";
import {DataEncoding} from "era-contracts/l1-contracts/contracts/common/libraries/DataEncoding.sol";

/// @notice Minimal ERC20 interface needed for transfers.
interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

/**
 * @title InvoicePayment
 * @dev A contract for cross-chain invoice payments with token conversion
 */
contract InvoicePayment {
    uint160 constant USER_CONTRACTS_OFFSET = 0x10000; // 2^16
    address constant L2_NATIVE_TOKEN_VAULT_ADDRESS = address(USER_CONTRACTS_OFFSET + 0x04);
    address constant L2_ASSET_ROUTER_ADDRESS = address(USER_CONTRACTS_OFFSET + 0x03);
    
    // Cross-chain fee in ETH
    uint256 public constant CROSS_CHAIN_FEE = 0.01 ether; // Same as TradeEscrow

    // Admin address
    address public admin;
    
    // Invoice status enum
    enum InvoiceStatus {
        Created,    // Invoice has been created but not paid
        Paid,       // Invoice has been paid
        Cancelled   // Invoice has been cancelled
    }
    
    // Invoice data structure
    struct Invoice {
        uint256 id;                 // Unique invoice ID
        address creator;            // Address that created the invoice
        address recipient;          // Address that needs to pay the invoice
        uint256 creatorChainId;     // Chain ID where the creator is
        uint256 recipientChainId;   // Chain ID where the recipient is
        address billingToken;       // Token address in which the invoice is billed
        uint256 amount;             // Billing amount
        address paymentToken;       // Token used for payment (if already paid)
        uint256 paymentAmount;      // Amount paid (if already paid)
        InvoiceStatus status;       // Current status of the invoice
        uint256 createdAt;          // Timestamp when invoice was created
        uint256 paidAt;             // Timestamp when invoice was paid (if paid)
    }
    
    // Whitelisted token structure
    struct TokenInfo {
        bool isWhitelisted;         // Whether the token is whitelisted
        string symbol;              // Token symbol (e.g., "SGD", "USDC", "TTBILL")
    }
    
    // Exchange rate structure (1 unit of token1 = rate units of token2)
    struct ExchangeRate {
        address token1;             // First token address
        address token2;             // Second token address
        uint256 rate;               // Exchange rate with 18 decimals precision
    }
    
    // Counter for invoice IDs
    uint256 private _nextInvoiceId = 1;
    
    // Mapping from invoice ID to Invoice data
    mapping(uint256 => Invoice) public invoices;
    
    // Mapping from user address to their invoice IDs (as creator)
    mapping(address => uint256[]) public userCreatedInvoices;
    
    // Mapping from user address to their invoice IDs (as recipient)
    mapping(address => uint256[]) public userPendingInvoices;
    
    // Mapping for whitelisted tokens
    mapping(address => TokenInfo) public whitelistedTokens;
    
    // Array to track all whitelisted token addresses (for enumeration)
    address[] private whitelistedTokenAddresses;
    
    // Mapping for exchange rates between tokens
    mapping(address => mapping(address => uint256)) public exchangeRates;

    // Constructor
    constructor() {
        admin = msg.sender;
    }

    // Modifier for admin-only functions
    modifier onlyAdmin() {
        require(msg.sender == admin, "InvoicePayment: caller is not the admin");
        _;
    }

    // Function to change admin
    function setAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "InvoicePayment: new admin is the zero address");
        admin = newAdmin;
    }

    // Events
    event InvoiceCreated(
        uint256 indexed id,
        address indexed creator,
        address indexed recipient,
        uint256 creatorChainId,
        uint256 recipientChainId,
        address billingToken,
        uint256 amount
    );
    
    event InvoicePaid(
        uint256 indexed id,
        address indexed payer,
        address paymentToken,
        uint256 paymentAmount,
        uint256 billingAmount
    );
    
    event InvoiceCancelled(
        uint256 indexed id,
        address indexed canceller
    );
    
    event TokenWhitelisted(
        address indexed token,
        string symbol
    );
    
    event TokenRemovedFromWhitelist(
        address indexed token
    );
    
    event ExchangeRateUpdated(
        address indexed token1,
        address indexed token2,
        uint256 rate
    );
    
    /**
     * @dev Remove the original whitelistToken function since we have an updated version below
     */
    
    /**
     * @dev Remove a token from the whitelist
     * @param token Address of the token to remove from whitelist
     */
    function removeTokenFromWhitelist(address token) external onlyAdmin {
        require(whitelistedTokens[token].isWhitelisted, "InvoicePayment: token is not whitelisted");
        
        delete whitelistedTokens[token];
        
        emit TokenRemovedFromWhitelist(token);
    }
    
    /**
     * @dev Set the exchange rate between two tokens
     * @param token1 Address of the first token
     * @param token2 Address of the second token
     * @param rate Exchange rate with 18 decimals precision (1 unit of token1 = rate units of token2)
     */
    function setExchangeRate(address token1, address token2, uint256 rate) external onlyAdmin {
        require(token1 != address(0), "InvoicePayment: token1 is the zero address");
        require(token2 != address(0), "InvoicePayment: token2 is the zero address");
        require(token1 != token2, "InvoicePayment: tokens must be different");
        require(rate > 0, "InvoicePayment: rate must be greater than zero");
        require(whitelistedTokens[token1].isWhitelisted, "InvoicePayment: token1 is not whitelisted");
        require(whitelistedTokens[token2].isWhitelisted, "InvoicePayment: token2 is not whitelisted");
        
        // Set rate in both directions
        exchangeRates[token1][token2] = rate;
        // Calculate reverse rate: 1 / rate = 10^36 / rate (using fixed-point arithmetic with 18 decimals)
        uint256 reverseRate = (10**36) / rate;
        exchangeRates[token2][token1] = reverseRate;
        
        emit ExchangeRateUpdated(token1, token2, rate);
        emit ExchangeRateUpdated(token2, token1, reverseRate);
    }
    
    /**
     * @dev Get the conversion amount from one token to another
     * @param fromToken Source token address
     * @param toToken Destination token address
     * @param amount Amount to convert
     * @return convertedAmount The converted amount
     */
    function getConversionAmount(address fromToken, address toToken, uint256 amount) public view returns (uint256) {
        if (fromToken == toToken) {
            return amount;
        }
        
        uint256 rate = exchangeRates[fromToken][toToken];
        require(rate > 0, "InvoicePayment: exchange rate not set");
        
        // Calculate amount * rate / 10^18 (using fixed-point arithmetic with 18 decimals)
        return (amount * rate) / 1e18;
    }
    
    /**
     * @dev Create a new invoice
     * @param recipient Address that needs to pay the invoice
     * @param recipientChainId Chain ID where the recipient is
     * @param billingToken Address of the token in which the invoice is billed
     * @param amount Amount of billing token
     * @return id The ID of the created invoice
     */
    function createInvoice(
        address recipient,
        uint256 recipientChainId,
        address billingToken,
        uint256 amount
    ) external returns (uint256) {
        require(recipient != address(0), "InvoicePayment: recipient is the zero address");
        require(amount > 0, "InvoicePayment: amount must be greater than zero");
        require(whitelistedTokens[billingToken].isWhitelisted, "InvoicePayment: billing token is not whitelisted");
        
        // Get current chain ID
        uint256 creatorChainId;
        assembly {
            creatorChainId := chainid()
        }
        
        // Create new invoice
        uint256 invoiceId = _nextInvoiceId++;
        Invoice storage newInvoice = invoices[invoiceId];
        newInvoice.id = invoiceId;
        newInvoice.creator = msg.sender;
        newInvoice.recipient = recipient;
        newInvoice.creatorChainId = creatorChainId;
        newInvoice.recipientChainId = recipientChainId;
        newInvoice.billingToken = billingToken;
        newInvoice.amount = amount;
        newInvoice.status = InvoiceStatus.Created;
        newInvoice.createdAt = block.timestamp;
        
        // Add to user created invoices
        userCreatedInvoices[msg.sender].push(invoiceId);
        
        // Check if recipient is on the same chain
        if (creatorChainId == recipientChainId) {
            // Add to recipient's pending invoices directly
            userPendingInvoices[recipient].push(invoiceId);
        } else {
            // For cross-chain invoices, the recipient will need to query the contract on their chain
            // The front-end will handle showing cross-chain invoices
        }
        
        emit InvoiceCreated(
            invoiceId,
            msg.sender,
            recipient,
            creatorChainId,
            recipientChainId,
            billingToken,
            amount
        );
        
        return invoiceId;
    }
    
    /**
     * @dev Cancel an invoice
     * @param invoiceId ID of the invoice to cancel
     */
    function cancelInvoice(uint256 invoiceId) external {
        Invoice storage invoice = invoices[invoiceId];
        
        require(invoice.id == invoiceId, "InvoicePayment: invoice does not exist");
        require(invoice.status == InvoiceStatus.Created, "InvoicePayment: invoice is not in Created status");
        
        // Check if sender is the creator, handling cross-chain aliased accounts
        address expectedSender = block.chainid == invoice.creatorChainId 
            ? invoice.creator 
            : IInteropHandler(address(L2_INTEROP_HANDLER)).getAliasedAccount(
                invoice.creator, 
                invoice.creatorChainId
            );
        require(msg.sender == expectedSender, "InvoicePayment: only creator can cancel");
        
        invoice.status = InvoiceStatus.Cancelled;
        
        emit InvoiceCancelled(invoiceId, msg.sender);
    }
    
    /**
     * @dev Pay an invoice using a specified token
     * @param invoiceId ID of the invoice to pay
     * @param paymentToken Address of the token to use for payment
     */
    function payInvoice(uint256 invoiceId, address paymentToken) external payable {
        Invoice storage invoice = invoices[invoiceId];
        
        require(invoice.id == invoiceId, "InvoicePayment: invoice does not exist");
        require(invoice.status == InvoiceStatus.Created, "InvoicePayment: invoice is not in Created status");
        
        // Check if sender is the recipient, handling cross-chain aliased accounts
        address expectedSender = block.chainid == invoice.recipientChainId 
            ? invoice.recipient 
            : IInteropHandler(address(L2_INTEROP_HANDLER)).getAliasedAccount(
                invoice.recipient, 
                invoice.recipientChainId
            );
        require(msg.sender == expectedSender, "InvoicePayment: only recipient can pay");
        
        require(whitelistedTokens[paymentToken].isWhitelisted, "InvoicePayment: payment token is not whitelisted");
        
        // Get current chain ID
        uint256 currentChainId;
        assembly {
            currentChainId := chainid()
        }
        
        // Calculate payment amount based on exchange rate
        uint256 paymentAmount = getConversionAmount(invoice.billingToken, paymentToken, invoice.amount);
        
        // Mark invoice as paid
        invoice.status = InvoiceStatus.Paid;
        invoice.paymentToken = paymentToken;
        invoice.paymentAmount = paymentAmount;
        invoice.paidAt = block.timestamp;
        
        // Transfer tokens from payer to contract
        IERC20(paymentToken).transferFrom(msg.sender, address(this), paymentAmount);
        
        // Transfer billing token to creator (handle cross-chain if needed)
        if (currentChainId == invoice.creatorChainId) {
            // Same chain - direct transfer
            IERC20(invoice.billingToken).transfer(invoice.creator, invoice.amount);
        } else {
            // Cross-chain transfer
            _transferTokensCrossChain(
                invoice.billingToken, 
                invoice.amount, 
                invoice.creatorChainId, 
                invoice.creator
            );
        }
        
        emit InvoicePaid(
            invoiceId,
            msg.sender,
            paymentToken,
            paymentAmount,
            invoice.amount
        );
    }
    
    /**
     * @dev Transfer tokens cross-chain
     * @param _tokenAddress Address of the token to transfer
     * @param _amount Amount of tokens to transfer
     * @param _recipientChainId Chain ID where the tokens should be sent
     * @param _recipient Address of the recipient on the destination chain
     */
    function _transferTokensCrossChain(
        address _tokenAddress, 
        uint256 _amount, 
        uint256 _recipientChainId, 
        address _recipient
    ) private {
        // If same chain, do a normal transfer
        if (block.chainid == _recipientChainId) {
            require(
                IERC20(_tokenAddress).transfer(_recipient, _amount),
                "Token transfer failed"
            );
            return;
        }
        
        // Approve token for cross-chain transfer
        IERC20(_tokenAddress).approve(L2_NATIVE_TOKEN_VAULT_ADDRESS, _amount);
        
        InteropCallStarter[] memory feePaymentCallStarters = new InteropCallStarter[](1);
        InteropCallStarter[] memory executionCallStarters = new InteropCallStarter[](1);

        feePaymentCallStarters[0] = InteropCallStarter(
            true,
            L2_STANDARD_TRIGGER_ACCOUNT_ADDR,
            "",
            0,
            CROSS_CHAIN_FEE
        );

        executionCallStarters[0] = InteropCallStarter(
            false,
            L2_ASSET_ROUTER_ADDRESS,
            bytes.concat(
                bytes1(0x01),
                abi.encode(
                    DataEncoding.encodeNTVAssetId(block.chainid, _tokenAddress),
                    abi.encode(
                        _amount,
                        _recipient,
                        address(0)
                    )
                )
            ),
            0,
            0
        );

        GasFields memory gasFields = GasFields(
            30000000,
            1000,
            _recipient,
            address(0),
            ""
        );

        require(address(this).balance >= CROSS_CHAIN_FEE, "Insufficient ETH for interop call");

        IInteropCenter(address(L2_INTEROP_CENTER)).requestInterop{ value: CROSS_CHAIN_FEE }(
            _recipientChainId,
            L2_STANDARD_TRIGGER_ACCOUNT_ADDR,
            feePaymentCallStarters,
            executionCallStarters,
            gasFields
        );
    }
    
    /**
     * @dev Withdraw accumulated tokens to admin (for rebalancing liquidity)
     * @param token Address of the token to withdraw
     * @param amount Amount of tokens to withdraw
     */
    function withdrawTokens(address token, uint256 amount) external onlyAdmin {
        require(token != address(0), "InvoicePayment: token is the zero address");
        require(amount > 0, "InvoicePayment: amount must be greater than zero");
        
        IERC20(token).transfer(admin, amount);
    }
    
    /**
     * @dev Get the number of invoices created by a user
     * @param user Address of the user
     * @return count Number of invoices created by the user
     */
    function getUserCreatedInvoiceCount(address user) external view returns (uint256) {
        return userCreatedInvoices[user].length;
    }
    
    /**
     * @dev Get the invoice IDs created by a user for a specific range
     * @param user Address of the user
     * @param startIndex Start index in the user's created invoices array
     * @param endIndex End index in the user's created invoices array (exclusive)
     * @return invoiceIds Array of invoice IDs
     */
    function getUserCreatedInvoices(
        address user, 
        uint256 startIndex, 
        uint256 endIndex
    ) external view returns (uint256[] memory) {
        require(startIndex < endIndex, "InvoicePayment: invalid range");
        require(endIndex <= userCreatedInvoices[user].length, "InvoicePayment: index out of bounds");
        
        uint256[] memory result = new uint256[](endIndex - startIndex);
        for (uint256 i = startIndex; i < endIndex; i++) {
            result[i - startIndex] = userCreatedInvoices[user][i];
        }
        
        return result;
    }
    
    /**
     * @dev Get the number of pending invoices for a user
     * @param user Address of the user
     * @return count Number of pending invoices for the user
     */
    function getUserPendingInvoiceCount(address user) external view returns (uint256) {
        return userPendingInvoices[user].length;
    }
    
    /**
     * @dev Get the pending invoice IDs for a user for a specific range
     * @param user Address of the user
     * @param startIndex Start index in the user's pending invoices array
     * @param endIndex End index in the user's pending invoices array (exclusive)
     * @return invoiceIds Array of invoice IDs
     */
    function getUserPendingInvoices(
        address user, 
        uint256 startIndex, 
        uint256 endIndex
    ) external view returns (uint256[] memory) {
        require(startIndex < endIndex, "InvoicePayment: invalid range");
        require(endIndex <= userPendingInvoices[user].length, "InvoicePayment: index out of bounds");
        
        uint256[] memory result = new uint256[](endIndex - startIndex);
        for (uint256 i = startIndex; i < endIndex; i++) {
            result[i - startIndex] = userPendingInvoices[user][i];
        }
        
        return result;
    }
    
    /**
     * @dev Get all whitelisted tokens
     * @return tokenAddresses Array of whitelisted token addresses
     * @return symbols Array of corresponding token symbols
     */
    function getWhitelistedTokens() external view returns (address[] memory, string[] memory) {
        // Count whitelisted tokens first
        uint256 count = 0;
        for (uint256 i = 0; i < whitelistedTokenAddresses.length; i++) {
            if (whitelistedTokens[whitelistedTokenAddresses[i]].isWhitelisted) {
                count++;
            }
        }
        
        // Create arrays for result
        address[] memory tokenAddresses = new address[](count);
        string[] memory symbols = new string[](count);
        
        // Fill arrays
        uint256 index = 0;
        for (uint256 i = 0; i < whitelistedTokenAddresses.length; i++) {
            address token = whitelistedTokenAddresses[i];
            if (whitelistedTokens[token].isWhitelisted) {
                tokenAddresses[index] = token;
                symbols[index] = whitelistedTokens[token].symbol;
                index++;
            }
        }
        
        return (tokenAddresses, symbols);
    }
    
    /**
     * @dev Get detailed invoice information
     * @param invoiceId ID of the invoice
     * @return id Invoice ID
     * @return creator Address that created the invoice
     * @return recipient Address that needs to pay the invoice
     * @return creatorChainId Chain ID where the creator is
     * @return recipientChainId Chain ID where the recipient is
     * @return billingToken Token address in which the invoice is billed
     * @return amount Billing amount
     * @return paymentToken Token used for payment (if already paid)
     * @return paymentAmount Amount paid (if already paid)
     * @return status Current status of the invoice
     * @return createdAt Timestamp when invoice was created
     * @return paidAt Timestamp when invoice was paid (if paid)
     */
    function getInvoiceDetails(uint256 invoiceId) external view returns (
        uint256 id,
        address creator,
        address recipient,
        uint256 creatorChainId,
        uint256 recipientChainId,
        address billingToken,
        uint256 amount,
        address paymentToken,
        uint256 paymentAmount,
        InvoiceStatus status,
        uint256 createdAt,
        uint256 paidAt
    ) {
        Invoice storage invoice = invoices[invoiceId];
        require(invoice.id == invoiceId, "InvoicePayment: invoice does not exist");
        
        return (
            invoice.id,
            invoice.creator,
            invoice.recipient,
            invoice.creatorChainId,
            invoice.recipientChainId,
            invoice.billingToken,
            invoice.amount,
            invoice.paymentToken,
            invoice.paymentAmount,
            invoice.status,
            invoice.createdAt,
            invoice.paidAt
        );
    }
    
    /**
     * @dev Modified whitelistToken function to track token addresses
     * @param token Address of the token to whitelist
     * @param symbol Symbol of the token (e.g., "SGD", "USDC")
     */
    function whitelistToken(address token, string calldata symbol) external onlyAdmin {
        require(token != address(0), "InvoicePayment: token is the zero address");
        require(bytes(symbol).length > 0, "InvoicePayment: symbol cannot be empty");
        
        // Add to whitelisted token mapping
        if (!whitelistedTokens[token].isWhitelisted) {
            // Only add to array if not already whitelisted
            whitelistedTokenAddresses.push(token);
        }
        
        whitelistedTokens[token] = TokenInfo({
            isWhitelisted: true,
            symbol: symbol
        });
        
        emit TokenWhitelisted(token, symbol);
    }
    
    /**
     * @dev Allows the contract to receive ETH, needed for cross-chain transfers
     */
    receive() external payable {}
}