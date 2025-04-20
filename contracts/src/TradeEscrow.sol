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

/// @title TradeEscrow
/// @notice A demo escrow contract for inter-custodial settlements.
///         This version uses a simplified status system and only exposes swap details
///         (including their status) to the involved counterparties.
contract TradeEscrow {
    uint160 constant USER_CONTRACTS_OFFSET = 0x10000; // 2^16
    address constant L2_NATIVE_TOKEN_VAULT_ADDRESS = address(USER_CONTRACTS_OFFSET + 0x04);
    address constant L2_ASSET_ROUTER_ADDRESS = address(USER_CONTRACTS_OFFSET + 0x03);
    
    /// @notice Trade status values.
    enum TradeStatus { PendingApproval, PendingFunds, Complete, Declined }
    
    /// @notice Data structure for a trade.
    struct Trade {
        uint256 tradeId;
        address partyA;     // Proposer
        address partyB;     // Counterparty
        uint256 partyBChainId; // Counterparty chain id
        address tokenA;     // Token that Party A sends
        uint256 amountA;    // Amount that Party A sends
        address tokenB;     // Token that Party B sends
        uint256 amountB;    // Amount that Party B sends
        bool depositedA;    // Whether Party A has deposited
        bool depositedB;    // Whether Party B has deposited
        TradeStatus status; // Current status of the trade (Pending, Complete, Declined)
    }
    
    uint256 public tradeCounter;
    mapping(uint256 => Trade) public trades;
    
    // Mapping from user address to the list of trade IDs they’re involved in.
    mapping(address => uint256[]) public userTrades;
    
    // --- Events ---
    event TradeProposed(uint256 indexed tradeId, address indexed proposer, address indexed counterparty);
    event TradeAccepted(uint256 indexed tradeId, address indexed acceptor);
    event DepositMade(uint256 indexed tradeId, address indexed party, address token, uint256 amount);
    event DepositRefunded(uint256 indexed tradeId, address indexed party, address token, uint256 amount);
    event TradeSettled(uint256 indexed tradeId);
    event TradeCancelled(uint256 indexed tradeId, address indexed party);
    
    // --- Trade Lifecycle Functions ---
    
    /// @notice Proposes a new trade.
    /// @param _partyB The counterparty (Party B) who will eventually accept the trade.
    /// @param _partyBChainId The counterparty's (Party B) chain id.
    /// @param _tokenA The token address that the proposer (Party A) will deposit.
    /// @param _amountA The amount of tokenA Party A will deposit.
    /// @param _tokenB The token address that the counterparty (Party B) will deposit.
    /// @param _amountB The amount of tokenB Party B will deposit.
    /// @return tradeId The unique identifier for the proposed trade.
    function proposeTrade(
        address _partyB,
        uint256 _partyBChainId,
        address _tokenA,
        uint256 _amountA,
        address _tokenB,
        uint256 _amountB
    ) external returns (uint256 tradeId) {
        tradeCounter++;
        tradeId = tradeCounter;
        
        trades[tradeId] = Trade({
            tradeId: tradeId,
            partyA: msg.sender,
            partyB: _partyB,
            partyBChainId: _partyBChainId,
            tokenA: _tokenA,
            amountA: _amountA,
            tokenB: _tokenB,
            amountB: _amountB,
            depositedA: false,
            depositedB: false,
            status: TradeStatus.PendingApproval
        });
        
        // Record this trade for both participants.
        userTrades[msg.sender].push(tradeId);
        userTrades[_partyB].push(tradeId);
        
        emit TradeProposed(tradeId, msg.sender, _partyB);
    }
    
    /// @notice Counterparty (Party B) accepts a proposed trade.
    /// @param _tradeId The identifier of the trade to accept.
    function acceptTrade(uint256 _tradeId) external {
        Trade storage trade = trades[_tradeId];
        require(trade.status == TradeStatus.PendingApproval, "Trade is not pending");
        address expectedSender = block.chainid == trade.partyBChainId ? trade.partyB : IInteropHandler(address(L2_INTEROP_HANDLER)).getAliasedAccount(trade.partyB, trade.partyBChainId);
        require(msg.sender == expectedSender, "Only the designated counterparty can accept");
        
        trade.status = TradeStatus.PendingFunds;

        emit TradeAccepted(_tradeId, msg.sender);
    }
    
    /// @notice Deposits tokens into escrow. Must be called by Party A or Party B.
    ///         The caller must have approved the escrow contract to transfer the tokens.
    /// @param _tradeId The trade identifier.
    function deposit(uint256 _tradeId) external {
        Trade storage trade = trades[_tradeId];
        require(trade.status == TradeStatus.PendingFunds, "Trade is not approved");
        address expectedPartyB = block.chainid == trade.partyBChainId ? trade.partyB : IInteropHandler(address(L2_INTEROP_HANDLER)).getAliasedAccount(trade.partyB, trade.partyBChainId);
        
        // Handle deposit based on caller's role.
        if (msg.sender == trade.partyA) {
            require(!trade.depositedA, "Party A already deposited");
            require(
                IERC20(trade.tokenA).transferFrom(msg.sender, address(this), trade.amountA),
                "TokenA transfer failed"
            );
            trade.depositedA = true;
            emit DepositMade(_tradeId, msg.sender, trade.tokenA, trade.amountA);
        } else if (msg.sender == expectedPartyB) {
            require(!trade.depositedB, "Party B already deposited");
            require(
                IERC20(trade.tokenB).transferFrom(msg.sender, address(this), trade.amountB),
                "TokenB transfer failed"
            );
            trade.depositedB = true;
            emit DepositMade(_tradeId, msg.sender, trade.tokenB, trade.amountB);
        } else {
            revert("Only designated parties can deposit");
        }
        
        // If both parties have deposited, settle the trade.
        if (trade.depositedA && trade.depositedB) {
            _settleTrade(_tradeId);
        }
    }
    
    /// @notice Internal function that settles the trade once both deposits are made.
    ///         It transfers Party A's tokens to Party B and vice versa.
    /// @param _tradeId The trade identifier.
    function _settleTrade(uint256 _tradeId) internal {
        Trade storage trade = trades[_tradeId];
        require(trade.depositedA && trade.depositedB, "Both parties must deposit before settlement");
        
        trade.status = TradeStatus.Complete;
        
        // Transfer Party A's token to Party B.
        if (block.chainid == trade.partyBChainId) {
            require(
                IERC20(trade.tokenA).transfer(trade.partyB, trade.amountA),
                "Settlement transfer for tokenA failed"
            );
        } else {
            // Approve token
            IERC20(trade.tokenA).approve(L2_NATIVE_TOKEN_VAULT_ADDRESS, trade.amountA);
            InteropCallStarter[] memory feePaymentCallStarters = new InteropCallStarter[](1);
            InteropCallStarter[] memory executionCallStarters = new InteropCallStarter[](1);

            feePaymentCallStarters[0] = InteropCallStarter(
                true,
                L2_STANDARD_TRIGGER_ACCOUNT_ADDR,
                "",
                0,
                0xB1A2BC2EC50000
            );

            executionCallStarters[0] = InteropCallStarter(
                false,
                L2_ASSET_ROUTER_ADDRESS,
                abi.encode(
                    0x01,
                    abi.encode(
                        DataEncoding.encodeNTVAssetId(block.chainid, trade.tokenA),
                        abi.encode(
                            trade.amountA,
                            trade.partyB,
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
                trade.partyB,
                address(0),
                ""
            );

            uint256 valueToSend = feePaymentCallStarters[0].requestedInteropCallValue +
                executionCallStarters[0].requestedInteropCallValue;

            require(address(this).balance >= valueToSend, "Insufficient ETH for interop call");

            IInteropCenter(address(L2_INTEROP_CENTER)).requestInterop{ value: valueToSend }(
                trade.partyBChainId,
                L2_STANDARD_TRIGGER_ACCOUNT_ADDR,
                feePaymentCallStarters,
                executionCallStarters,
                gasFields
            );
        }

        // Transfer Party B's token to Party A.
        require(
            IERC20(trade.tokenB).transfer(trade.partyA, trade.amountB),
            "Settlement transfer for tokenB failed"
        );
        
        emit TradeSettled(_tradeId);
    }
    
    /// @notice Allows either party to cancel a trade that has not been completed.
    /// @param _tradeId The trade identifier.
    function cancelTrade(uint256 _tradeId) external {
        Trade storage trade = trades[_tradeId];
        require(
            trade.status == TradeStatus.PendingApproval || trade.status == TradeStatus.PendingFunds,
            "Trade is not pending and cannot be cancelled"
        );
        address expectedSenderB = block.chainid == trade.partyBChainId ? trade.partyB : IInteropHandler(address(L2_INTEROP_HANDLER)).getAliasedAccount(trade.partyB, trade.partyBChainId);
        require(
            msg.sender == trade.partyA || msg.sender == expectedSenderB,
            "Not authorized to cancel"
        );

        // Handle refunds.
        if (trade.depositedA) {
            require(
                IERC20(trade.tokenA).transfer(trade.partyA, trade.amountA),
                "TokenA refund transfer failed"
            );
            trade.depositedA = false;
            emit DepositRefunded(_tradeId, trade.partyA, trade.tokenA, trade.amountA);
        } else if (trade.depositedB) {
            /* TODO: this should interop transfer back (when party B is from a different chain */
            require(
                IERC20(trade.tokenB).transfer(trade.partyB, trade.amountB),
                "TokenB refund transfer failed"
            );
            trade.depositedB = false;
            emit DepositRefunded(_tradeId, trade.partyB, trade.tokenB, trade.amountB);
        }
        
        trade.status = TradeStatus.Declined;
        emit TradeCancelled(_tradeId, msg.sender);
    }
    
    /// @notice Returns all swaps (trades) in which the address is a participant.
    ///         This function only returns swap details for which the address is either the proposer or the counterparty.
    /// @return myTrades An array of Trade structs filtered for the address.
    function getMySwaps(address myAddress) external view returns (Trade[] memory myTrades) {
        uint256[] storage myTradeIds = userTrades[myAddress];
        uint256 count = myTradeIds.length;
        myTrades = new Trade[](count);
        for (uint256 i = 0; i < count; i++) {
            myTrades[i] = trades[myTradeIds[i]];
        }
    }

    receive() external payable {}
}
