// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title RepoContract
 * @dev This contract implements an on-chain intraday repo system.
 *
 * The repo system allows:
 * 1. Users to create lending offers by specifying a token they want to lend,
 *    the collateral they require, the amounts, and a duration.
 * 2. Other users to borrow these tokens by providing the required collateral.
 * 3. Borrowers to repay the loan within the specified duration to retrieve their collateral.
 * 4. Lenders to claim the collateral if the loan is not repaid within the duration plus grace period.
 *
 * Key features:
 * - Fixed duration loans with clear start and end times
 * - Grace period for repayments (configurable)
 * - No interest payments (zero interest)
 * - Full collateralization
 * - Lender protection through collateral claiming mechanism
 */

/// @notice Minimal ERC20 interface needed for transfers.
interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

/// @title RepoContract
/// @notice An on-chain intraday repo contract that allows users to lend and borrow tokens
///         with collateral for specified durations.
contract RepoContract {
    /// @notice Repo offer status values.
    enum OfferStatus { Open, Active, Completed, Cancelled, Defaulted }
    
    /// @notice Data structure for a repo offer.
    struct RepoOffer {
        uint256 offerId;
        address lender;          // User who creates the offer and lends tokens
        address borrower;        // User who accepts the offer and provides collateral
        address lendToken;       // Token that lender is offering
        uint256 lendAmount;      // Amount of lendToken
        address collateralToken; // Token required as collateral
        uint256 collateralAmount; // Amount of collateral required
        uint256 duration;        // Duration in seconds
        uint256 startTime;       // Timestamp when borrowing started
        uint256 endTime;         // Timestamp when repayment is due
        OfferStatus status;      // Current status of the offer
    }
    
    uint256 public offerCounter;
    mapping(uint256 => RepoOffer) public offers;
    
    // Mapping from user address to the list of offer IDs they're involved in.
    mapping(address => uint256[]) public userLenderOffers;
    mapping(address => uint256[]) public userBorrowerOffers;
    
    // Admin address that can change contract parameters
    address public admin;
    
    // Grace period for repayment (in seconds, default 2 minutes)
    uint256 public gracePeriod = 2 minutes;
    
    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    /// @notice Contract constructor
    /// @param _admin Address of the admin who can update contract parameters
    constructor(address _admin) {
        require(_admin != address(0), "Admin cannot be zero address");
        admin = _admin;
    }
    
    // --- Events ---
    event OfferCreated(uint256 indexed offerId, address indexed lender);
    event OfferAccepted(uint256 indexed offerId, address indexed borrower);
    event LoanRepaid(uint256 indexed offerId);
    event OfferCancelled(uint256 indexed offerId);
    event CollateralReleased(uint256 indexed offerId);
    event CollateralClaimed(uint256 indexed offerId);
    event GracePeriodUpdated(uint256 newGracePeriod);
    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);
    
    // --- Offer Creation ---
    
    /// @notice Creates a new repo offer and deposits lend tokens.
    /// @param _lendToken The token address that the lender is offering.
    /// @param _lendAmount The amount of lendToken being offered.
    /// @param _collateralToken The token address required as collateral.
    /// @param _collateralAmount The amount of collateral required.
    /// @param _duration The duration in seconds for which the funds can be borrowed.
    /// @return offerId The unique identifier for the created offer.
    function createOffer(
        address _lendToken,
        uint256 _lendAmount,
        address _collateralToken,
        uint256 _collateralAmount,
        uint256 _duration
    ) external returns (uint256 offerId) {
        require(_lendToken != address(0), "Invalid lend token");
        require(_collateralToken != address(0), "Invalid collateral token");
        require(_lendAmount > 0, "Lend amount must be greater than 0");
        require(_collateralAmount > 0, "Collateral amount must be greater than 0");
        require(_duration > 0, "Duration must be greater than 0");
        
        // Create the offer
        offerCounter++;
        offerId = offerCounter;
        
        offers[offerId] = RepoOffer({
            offerId: offerId,
            lender: msg.sender,
            borrower: address(0),
            lendToken: _lendToken,
            lendAmount: _lendAmount,
            collateralToken: _collateralToken,
            collateralAmount: _collateralAmount,
            duration: _duration,
            startTime: 0,
            endTime: 0,
            status: OfferStatus.Open
        });
        
        // Record this offer for the lender
        userLenderOffers[msg.sender].push(offerId);
        
        // Transfer lend tokens from lender to contract
        require(
            IERC20(_lendToken).transferFrom(msg.sender, address(this), _lendAmount),
            "Lend token transfer failed"
        );
        
        emit OfferCreated(offerId, msg.sender);
    }
    
    /// @notice Cancels an open offer and returns funds to the lender.
    /// @param _offerId The identifier of the offer to cancel.
    function cancelOffer(uint256 _offerId) external {
        RepoOffer storage offer = offers[_offerId];
        require(msg.sender == offer.lender, "Only lender can cancel");
        require(offer.status == OfferStatus.Open, "Offer is not open");
        
        // Update status
        offer.status = OfferStatus.Cancelled;
        
        // Return lend tokens to lender
        require(
            IERC20(offer.lendToken).transfer(offer.lender, offer.lendAmount),
            "Token return failed"
        );
        
        emit OfferCancelled(_offerId);
    }
    
    /// @notice Accepts an offer, deposits collateral, and receives lend tokens.
    /// @param _offerId The identifier of the offer to accept.
    function acceptOffer(uint256 _offerId) external {
        RepoOffer storage offer = offers[_offerId];
        require(offer.status == OfferStatus.Open, "Offer is not open");
        require(msg.sender != offer.lender, "Lender cannot borrow own offer");
        
        // Update offer details
        offer.borrower = msg.sender;
        offer.status = OfferStatus.Active;
        offer.startTime = block.timestamp;
        offer.endTime = block.timestamp + offer.duration;
        
        // Add to borrower's offers
        userBorrowerOffers[msg.sender].push(_offerId);
        
        // Transfer collateral from borrower to contract
        require(
            IERC20(offer.collateralToken).transferFrom(msg.sender, address(this), offer.collateralAmount),
            "Collateral transfer failed"
        );
        
        // Transfer lend tokens from contract to borrower
        require(
            IERC20(offer.lendToken).transfer(msg.sender, offer.lendAmount),
            "Lend token transfer failed"
        );
        
        emit OfferAccepted(_offerId, msg.sender);
    }
    
    /// @notice Repays the loan and releases collateral.
    /// @param _offerId The identifier of the offer to repay.
    function repayLoan(uint256 _offerId) external {
        RepoOffer storage offer = offers[_offerId];
        require(offer.status == OfferStatus.Active, "Loan is not active");
        require(msg.sender == offer.borrower, "Only borrower can repay");
        
        // Transfer lend tokens from borrower back to contract
        require(
            IERC20(offer.lendToken).transferFrom(msg.sender, address(this), offer.lendAmount),
            "Repayment transfer failed"
        );
        
        // Update status
        offer.status = OfferStatus.Completed;
        
        // Return collateral to borrower
        require(
            IERC20(offer.collateralToken).transfer(offer.borrower, offer.collateralAmount),
            "Collateral return failed"
        );
        
        // Return lend tokens to lender
        require(
            IERC20(offer.lendToken).transfer(offer.lender, offer.lendAmount),
            "Lend token return failed"
        );
        
        emit LoanRepaid(_offerId);
        emit CollateralReleased(_offerId);
    }
    
    /// @notice Allows lender to claim collateral if loan is not repaid after expiration + grace period.
    /// @param _offerId The identifier of the defaulted offer.
    function claimCollateral(uint256 _offerId) external {
        RepoOffer storage offer = offers[_offerId];
        require(offer.status == OfferStatus.Active, "Loan is not active");
        require(msg.sender == offer.lender, "Only lender can claim collateral");
        require(block.timestamp > offer.endTime + gracePeriod, "Loan still in grace period");
        
        // Update status
        offer.status = OfferStatus.Defaulted;
        
        // Transfer collateral to lender
        require(
            IERC20(offer.collateralToken).transfer(offer.lender, offer.collateralAmount),
            "Collateral transfer failed"
        );
        
        emit CollateralClaimed(_offerId);
    }
    
    /// @notice Returns all open offers.
    /// @return openOffers An array of open RepoOffer structs.
    function getOpenOffers() external view returns (RepoOffer[] memory) {
        // Count open offers first
        uint256 openOfferCount = 0;
        for (uint256 i = 1; i <= offerCounter; i++) {
            if (offers[i].status == OfferStatus.Open) {
                openOfferCount++;
            }
        }
        
        // Create and populate result array
        RepoOffer[] memory openOffers = new RepoOffer[](openOfferCount);
        uint256 currentIndex = 0;
        
        for (uint256 i = 1; i <= offerCounter; i++) {
            if (offers[i].status == OfferStatus.Open) {
                openOffers[currentIndex] = offers[i];
                currentIndex++;
            }
        }
        
        return openOffers;
    }
    
    /// @notice Returns all offers where the user is the lender.
    /// @param _user The address of the lender.
    /// @return lenderOffers An array of RepoOffer structs.
    function getLenderOffers(address _user) external view returns (RepoOffer[] memory) {
        uint256[] storage offerIds = userLenderOffers[_user];
        RepoOffer[] memory lenderOffers = new RepoOffer[](offerIds.length);
        
        for (uint256 i = 0; i < offerIds.length; i++) {
            lenderOffers[i] = offers[offerIds[i]];
        }
        
        return lenderOffers;
    }
    
    /// @notice Returns all offers where the user is the borrower.
    /// @param _user The address of the borrower.
    /// @return borrowerOffers An array of RepoOffer structs.
    function getBorrowerOffers(address _user) external view returns (RepoOffer[] memory) {
        uint256[] storage offerIds = userBorrowerOffers[_user];
        RepoOffer[] memory borrowerOffers = new RepoOffer[](offerIds.length);
        
        for (uint256 i = 0; i < offerIds.length; i++) {
            borrowerOffers[i] = offers[offerIds[i]];
        }
        
        return borrowerOffers;
    }
    
    /// @notice Sets the grace period for loan repayments.
    /// @param _gracePeriod The new grace period in seconds.
    function setGracePeriod(uint256 _gracePeriod) external onlyAdmin {
        gracePeriod = _gracePeriod;
        emit GracePeriodUpdated(_gracePeriod);
    }
    
    /// @notice Updates the admin address.
    /// @param _newAdmin The new admin address.
    function setAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "New admin cannot be zero address");
        address oldAdmin = admin;
        admin = _newAdmin;
        emit AdminChanged(oldAdmin, _newAdmin);
    }
}