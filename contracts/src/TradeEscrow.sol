// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal ERC20 interface needed for transfers.
interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
}

/// @title TradeEscrow
/// @notice A demo escrow contract for inter-custodial settlements.
///         This version uses a simplified status system and only exposes swap details
///         (including their status) to the involved counterparties.
contract TradeEscrow {    
    /// @notice Trade status values.
    enum TradeStatus { PendingCounterpartyDeposit, Complete, Declined }
    
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
    event DepositMade(uint256 indexed tradeId, address indexed party, address token, uint256 amount);
    event DepositRefunded(uint256 indexed tradeId, address indexed party, address token, uint256 amount);
    event TradeSettled(uint256 indexed tradeId);
    event TradeCancelled(uint256 indexed tradeId, address indexed party);
    
    // --- Trade Lifecycle Functions ---
    
    // Removed proposeTrade function as it's no longer needed - we always use proposeTradeAndDeposit now
    
    /// @notice Proposes a new trade and deposits funds in one transaction.
    /// @param _partyB The counterparty (Party B) who will eventually deposit.
    /// @param _partyBChainId The counterparty's (Party B) chain id.
    /// @param _tokenA The token address that the proposer (Party A) will deposit.
    /// @param _amountA The amount of tokenA Party A will deposit.
    /// @param _tokenB The token address that the counterparty (Party B) will deposit.
    /// @param _amountB The amount of tokenB Party B will deposit.
    /// @return tradeId The unique identifier for the proposed trade.
    function proposeTradeAndDeposit(
        address _partyB,
        uint256 _partyBChainId,
        address _tokenA,
        uint256 _amountA,
        address _tokenB,
        uint256 _amountB
    ) external returns (uint256 tradeId) {
        // Create the trade
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
            status: TradeStatus.PendingCounterpartyDeposit
        });
        
        // Record this trade for both participants
        userTrades[msg.sender].push(tradeId);
        userTrades[_partyB].push(tradeId);
        
        emit TradeProposed(tradeId, msg.sender, _partyB);
        
        // Deposit funds immediately
        require(
            IERC20(_tokenA).transferFrom(msg.sender, address(this), _amountA),
            "TokenA transfer failed"
        );
        trades[tradeId].depositedA = true;
        
        emit DepositMade(tradeId, msg.sender, _tokenA, _amountA);
    }
    
    // Removed the acceptTrade function as it's no longer needed in the 2-step UX
    
    // Removed deposit function to enforce strict 2-step process
 
    /// @notice Counterparty (Party B) deposits their tokens to complete the trade.
    /// @param _tradeId The identifier of the trade to deposit for.
    function acceptAndDeposit(uint256 _tradeId) external {
        Trade storage trade = trades[_tradeId];
        require(trade.status == TradeStatus.PendingCounterpartyDeposit, "Trade is not pending deposit");
        address expectedSender = trade.partyB;
        require(msg.sender == expectedSender, "Only the designated counterparty can deposit");
        
        // Deposit
        require(!trade.depositedB, "Party B already deposited");
        require(
            IERC20(trade.tokenB).transferFrom(msg.sender, address(this), trade.amountB),
            "TokenB transfer failed"
        );
        trade.depositedB = true;
        emit DepositMade(_tradeId, msg.sender, trade.tokenB, trade.amountB);
        
        // If both parties have deposited, settle the trade
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
        _transferTokens(trade.tokenA, trade.amountA, trade.partyB, trade.partyBChainId);

        // Transfer Party B's token to Party A.
        _transferTokens(trade.tokenB, trade.amountB, trade.partyA, block.chainid);
        
        emit TradeSettled(_tradeId);
    }
    
    /// @notice Private function to transfer tokens to the recipient
    /// @param _tokenAddress The address of the token to transfer
    /// @param _amount The amount of tokens to transfer
    /// @param _recipient The recipient address
    /// @param _recipientChainId The chain ID of the recipient
    function _transferTokens(
        address _tokenAddress,
        uint256 _amount,
        address _recipient,
        uint256 _recipientChainId
    ) private {
        // If same chain, do a normal transfer
        if (block.chainid == _recipientChainId) {
            require(
                IERC20(_tokenAddress).transfer(_recipient, _amount),
                "Token transfer failed"
            );
            return;
        }
        revert("Cross-chain transfer not supported in this version");
    }

    /// @notice Allows either party to cancel a trade that has not been completed.
    /// @param _tradeId The trade identifier.
    function cancelTrade(uint256 _tradeId) external {
        Trade storage trade = trades[_tradeId];
        require(
            trade.status == TradeStatus.PendingCounterpartyDeposit,
            "Trade is not pending and cannot be cancelled"
        );
        address expectedSenderB = trade.partyB;
        require(
            msg.sender == trade.partyA || msg.sender == expectedSenderB,
            "Not authorized to cancel"
        );

        // Handle refunds.
        if (trade.depositedA) {
            _transferTokens(trade.tokenA, trade.amountA, trade.partyA, block.chainid);
            trade.depositedA = false;
            emit DepositRefunded(_tradeId, trade.partyA, trade.tokenA, trade.amountA);
        } 
        
        if (trade.depositedB) {
            _transferTokens(trade.tokenB, trade.amountB, trade.partyB, trade.partyBChainId);
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
