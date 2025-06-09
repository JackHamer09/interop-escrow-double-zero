// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/RepoContract.sol";
import "../src/TestnetERC20Token.sol";

contract RepoContractTest is Test {
    RepoContract public repo;
    TestnetERC20Token public tokenA;
    TestnetERC20Token public tokenB;
    
    address public admin = address(1);
    address public lender = address(2);
    address public borrower = address(3);
    
    uint256 public constant INITIAL_BALANCE = 1000 ether;
    uint256 public constant LEND_AMOUNT = 100 ether;
    uint256 public constant COLLATERAL_AMOUNT = 150 ether;
    uint256 public constant LOAN_DURATION = 10 minutes;
    
    event OfferCreated(uint256 indexed offerId, address indexed lender);
    event OfferAccepted(uint256 indexed offerId, address indexed borrower);
    event LoanRepaid(uint256 indexed offerId);
    event OfferCancelled(uint256 indexed offerId);
    event CollateralReleased(uint256 indexed offerId);
    event CollateralClaimed(uint256 indexed offerId);
    
    function setUp() public {
        // Deploy tokens
        tokenA = new TestnetERC20Token("Token A", "TKNA", 18);
        tokenB = new TestnetERC20Token("Token B", "TKNB", 18);
        
        // Deploy RepoContract with admin
        repo = new RepoContract(admin);
        
        // Mint initial balances
        tokenA.mint(lender, INITIAL_BALANCE);
        tokenB.mint(borrower, INITIAL_BALANCE);
        
        // Approve token transfers
        vm.startPrank(lender);
        tokenA.approve(address(repo), type(uint256).max);
        vm.stopPrank();
        
        vm.startPrank(borrower);
        tokenB.approve(address(repo), type(uint256).max);
        tokenA.approve(address(repo), type(uint256).max); // Also approve tokenA for repayment
        vm.stopPrank();
    }
    
    function testCreateOffer() public {
        vm.startPrank(lender);
        
        vm.expectEmit(true, true, false, true);
        emit OfferCreated(1, lender);
        
        uint256 offerId = repo.createOffer(
            address(tokenA),
            LEND_AMOUNT,
            address(tokenB),
            COLLATERAL_AMOUNT,
            LOAN_DURATION
        );
        
        assertEq(offerId, 1, "First offer ID should be 1");
        assertEq(tokenA.balanceOf(address(repo)), LEND_AMOUNT, "Contract should hold lend tokens");
        assertEq(tokenA.balanceOf(lender), INITIAL_BALANCE - LEND_AMOUNT, "Lender balance should be reduced");
        
        // Check offer details
        (
            uint256 storedId,
            address storedLender,
            address storedBorrower,
            address storedLendToken,
            uint256 storedLendAmount,
            address storedCollateralToken,
            uint256 storedCollateralAmount,
            uint256 storedDuration,
            uint256 storedStartTime,
            uint256 storedEndTime,
            RepoContract.OfferStatus storedStatus
        ) = repo.offers(offerId);
        
        assertEq(storedId, offerId);
        assertEq(storedLender, lender);
        assertEq(storedBorrower, address(0));
        assertEq(storedLendToken, address(tokenA));
        assertEq(storedLendAmount, LEND_AMOUNT);
        assertEq(storedCollateralToken, address(tokenB));
        assertEq(storedCollateralAmount, COLLATERAL_AMOUNT);
        assertEq(storedDuration, LOAN_DURATION);
        assertEq(storedStartTime, 0);
        assertEq(storedEndTime, 0);
        assertEq(uint(storedStatus), uint(RepoContract.OfferStatus.Open));
        
        vm.stopPrank();
    }
    
    function testAcceptOffer() public {
        // First create an offer
        vm.prank(lender);
        uint256 offerId = repo.createOffer(
            address(tokenA),
            LEND_AMOUNT,
            address(tokenB),
            COLLATERAL_AMOUNT,
            LOAN_DURATION
        );
        
        // Now accept the offer as borrower
        vm.startPrank(borrower);
        
        vm.expectEmit(true, true, false, true);
        emit OfferAccepted(offerId, borrower);
        
        repo.acceptOffer(offerId);
        
        // Check token balances
        assertEq(tokenA.balanceOf(borrower), LEND_AMOUNT, "Borrower should receive lend tokens");
        assertEq(tokenB.balanceOf(address(repo)), COLLATERAL_AMOUNT, "Contract should hold collateral tokens");
        assertEq(tokenB.balanceOf(borrower), INITIAL_BALANCE - COLLATERAL_AMOUNT, "Borrower balance should be reduced");
        
        // Check offer status
        (
            , , address storedBorrower, , , , , ,
            uint256 storedStartTime,
            uint256 storedEndTime,
            RepoContract.OfferStatus storedStatus
        ) = repo.offers(offerId);
        
        assertEq(storedBorrower, borrower);
        assertEq(storedStartTime > 0, true, "Start time should be set");
        assertEq(storedEndTime, storedStartTime + LOAN_DURATION, "End time should be start time + duration");
        assertEq(uint(storedStatus), uint(RepoContract.OfferStatus.Active));
        
        vm.stopPrank();
    }
    
    function testRepayLoan() public {
        // Create and accept an offer
        vm.prank(lender);
        uint256 offerId = repo.createOffer(
            address(tokenA),
            LEND_AMOUNT,
            address(tokenB),
            COLLATERAL_AMOUNT,
            LOAN_DURATION
        );
        
        vm.prank(borrower);
        repo.acceptOffer(offerId);
        
        // Now repay the loan
        vm.startPrank(borrower);
        
        // We need to expect both events that are emitted in repayLoan
        vm.expectEmit(true, false, false, true);
        emit LoanRepaid(offerId);
        vm.expectEmit(true, false, false, true);
        emit CollateralReleased(offerId);
        
        repo.repayLoan(offerId);
        
        // Check token balances
        assertEq(tokenA.balanceOf(lender), INITIAL_BALANCE, "Lender should receive lend tokens back");
        assertEq(tokenB.balanceOf(borrower), INITIAL_BALANCE, "Borrower should receive collateral tokens back");
        assertEq(tokenA.balanceOf(address(repo)), 0, "Contract should not hold any tokens");
        assertEq(tokenB.balanceOf(address(repo)), 0, "Contract should not hold any tokens");
        
        // Check offer status
        (, , , , , , , , , , RepoContract.OfferStatus storedStatus) = repo.offers(offerId);
        assertEq(uint(storedStatus), uint(RepoContract.OfferStatus.Completed));
        
        vm.stopPrank();
    }
    
    function testCancelOffer() public {
        // Create an offer
        vm.prank(lender);
        uint256 offerId = repo.createOffer(
            address(tokenA),
            LEND_AMOUNT,
            address(tokenB),
            COLLATERAL_AMOUNT,
            LOAN_DURATION
        );
        
        // Cancel the offer
        vm.startPrank(lender);
        
        vm.expectEmit(true, false, false, true);
        emit OfferCancelled(offerId);
        
        repo.cancelOffer(offerId);
        
        // Check token balances
        assertEq(tokenA.balanceOf(lender), INITIAL_BALANCE, "Lender should receive lend tokens back");
        assertEq(tokenA.balanceOf(address(repo)), 0, "Contract should not hold any tokens");
        
        // Check offer status
        (, , , , , , , , , , RepoContract.OfferStatus storedStatus) = repo.offers(offerId);
        assertEq(uint(storedStatus), uint(RepoContract.OfferStatus.Cancelled));
        
        vm.stopPrank();
    }
    
    function testClaimCollateral() public {
        // Create and accept an offer
        vm.prank(lender);
        uint256 offerId = repo.createOffer(
            address(tokenA),
            LEND_AMOUNT,
            address(tokenB),
            COLLATERAL_AMOUNT,
            LOAN_DURATION
        );
        
        vm.prank(borrower);
        repo.acceptOffer(offerId);
        
        // Warp time to after loan expiration + grace period
        vm.warp(block.timestamp + LOAN_DURATION + 2 minutes + 1);
        
        // Claim collateral as lender
        vm.startPrank(lender);
        
        vm.expectEmit(true, false, false, true);
        emit CollateralClaimed(offerId);
        
        repo.claimCollateral(offerId);
        
        // Check token balances
        assertEq(tokenB.balanceOf(lender), COLLATERAL_AMOUNT, "Lender should receive collateral tokens");
        assertEq(tokenB.balanceOf(address(repo)), 0, "Contract should not hold any tokens");
        
        // Check offer status
        (, , , , , , , , , , RepoContract.OfferStatus storedStatus) = repo.offers(offerId);
        assertEq(uint(storedStatus), uint(RepoContract.OfferStatus.Defaulted));
        
        vm.stopPrank();
    }
    
    function testCannotClaimCollateralBeforeExpiration() public {
        // Create and accept an offer
        vm.prank(lender);
        uint256 offerId = repo.createOffer(
            address(tokenA),
            LEND_AMOUNT,
            address(tokenB),
            COLLATERAL_AMOUNT,
            LOAN_DURATION
        );
        
        vm.prank(borrower);
        repo.acceptOffer(offerId);
        
        // Warp time to middle of loan duration
        vm.warp(block.timestamp + LOAN_DURATION / 2);
        
        // Try to claim collateral as lender (should fail)
        vm.startPrank(lender);
        vm.expectRevert("Loan still in grace period");
        repo.claimCollateral(offerId);
        vm.stopPrank();
    }
    
    function testAdminFunctionality() public {
        // Test setting grace period
        vm.prank(admin);
        repo.setGracePeriod(5 minutes);
        assertEq(repo.gracePeriod(), 5 minutes, "Grace period should be updated");
        
        // Test non-admin cannot set grace period
        vm.prank(lender);
        vm.expectRevert("Only admin can perform this action");
        repo.setGracePeriod(10 minutes);
        
        // Test changing admin
        vm.startPrank(admin);
        repo.setAdmin(address(4));
        assertEq(repo.admin(), address(4), "Admin should be updated");
        vm.stopPrank();
        
        // Test old admin cannot set grace period
        vm.prank(admin);
        vm.expectRevert("Only admin can perform this action");
        repo.setGracePeriod(15 minutes);
        
        // Test new admin can set grace period
        vm.prank(address(4));
        repo.setGracePeriod(15 minutes);
        assertEq(repo.gracePeriod(), 15 minutes, "Grace period should be updated by new admin");
    }
}