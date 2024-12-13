// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {Math} from "openzeppelin-contracts/contracts/utils/math/Math.sol";

contract CPAMM {
    IERC20 public immutable token0;
    IERC20 public immutable token1;

    uint256 public reserve0;
    uint256 public reserve1;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;

    // Fee tiers
    uint256 private constant BASIC_FEE = 10; // 1%
    uint256 private constant PREMIUM_FEE = 5; // 0.5%
    uint256 private constant VIP_FEE = 3; // 0.3%

    // 0 = basic, 1 = premium, 2 = vip
    mapping(address => uint256) public userFeeTier;

    // Swap limit tiers (in token units)
    uint256 private constant BASIC_LIMIT = 1000 * 1e18; // 1,000 tokens
    uint256 private constant PREMIUM_LIMIT = 5000 * 1e18; // 5,000 tokens
    uint256 private constant VIP_LIMIT = 25000 * 1e18; // 25,000 tokens

    // Track daily volumes and last transaction day
    mapping(address => uint256) public userDailyVolume;
    mapping(address => uint256) public lastTransactionDay;

    constructor(address _token0, address _token1) {
        token0 = IERC20(_token0);
        token1 = IERC20(_token1);
    }

    function setUserFeeTier(address user, uint256 tier) external {
        require(tier <= 2, "Invalid tier");
        userFeeTier[user] = tier;
    }

    function getReserves() external view returns (uint256, uint256) {
        return (reserve0, reserve1);
    }

    function _mint(address _to, uint256 _amount) private {
        balanceOf[_to] += _amount;
        totalSupply += _amount;
    }

    function _burn(address _from, uint256 _amount) private {
        balanceOf[_from] -= _amount;
        totalSupply -= _amount;
    }

    function _update(uint256 _reserve0, uint256 _reserve1) private {
        reserve0 = _reserve0;
        reserve1 = _reserve1;
    }

    function swap(
        address _tokenIn,
        uint256 _amountIn
    ) external returns (uint256 amountOut) {
        require(
            _tokenIn == address(token0) || _tokenIn == address(token1),
            "invalid token"
        );
        require(_amountIn > 0, "amount in = 0");

        _updateDailyVolume(msg.sender, _amountIn);

        bool isToken0 = _tokenIn == address(token0);
        (
            IERC20 tokenIn,
            IERC20 tokenOut,
            uint256 reserveIn,
            uint256 reserveOut
        ) = isToken0
                ? (token0, token1, reserve0, reserve1)
                : (token1, token0, reserve1, reserve0);

        tokenIn.transferFrom(msg.sender, address(this), _amountIn);

        /*
        How much dy for dx?

        xy = k
        (x + dx)(y - dy) = k
        y - dy = k / (x + dx)
        y - k / (x + dx) = dy
        y - xy / (x + dx) = dy
        (yx + ydx - xy) / (x + dx) = dy
        ydx / (x + dx) = dy
        */
        uint256 fee = getUserFee(msg.sender);
        uint256 amountInWithFee = (_amountIn * (1000 - fee)) / 1000;

        amountOut =
            (reserveOut * amountInWithFee) /
            (reserveIn + amountInWithFee);

        tokenOut.transfer(msg.sender, amountOut);

        _update(
            token0.balanceOf(address(this)),
            token1.balanceOf(address(this))
        );
    }

    function allowedToAddLiquidity() external view returns (bool) {
      return userFeeTier[msg.sender] == 1 || userFeeTier[msg.sender] == 2;
    }

    function addLiquidity(
        uint256 _amount0,
        uint256 _amount1
    ) external onlyPremiumOrVip returns (uint256 shares) {
        token0.transferFrom(msg.sender, address(this), _amount0);
        token1.transferFrom(msg.sender, address(this), _amount1);

        /*
        How much dx, dy to add?

        xy = k
        (x + dx)(y + dy) = k'

        No price change, before and after adding liquidity
        x / y = (x + dx) / (y + dy)

        x(y + dy) = y(x + dx)
        x * dy = y * dx

        x / y = dx / dy
        dy = y / x * dx
        */
        // Commented out because it's not needed for our PoC
        // if (reserve0 > 0 || reserve1 > 0) {
        //     require(
        //         reserve0 * _amount1 == reserve1 * _amount0,
        //         "x / y != dx / dy"
        //     );
        // }

        /*
        How much shares to mint?

        f(x, y) = value of liquidity
        We will define f(x, y) = sqrt(xy)

        L0 = f(x, y)
        L1 = f(x + dx, y + dy)
        T = total shares
        s = shares to mint

        Total shares should increase proportional to increase in liquidity
        L1 / L0 = (T + s) / T

        L1 * T = L0 * (T + s)

        (L1 - L0) * T / L0 = s
        */

        /*
        Claim
        (L1 - L0) / L0 = dx / x = dy / y

        Proof
        --- Equation 1 ---
        (L1 - L0) / L0 = (sqrt((x + dx)(y + dy)) - sqrt(xy)) / sqrt(xy)

        dx / dy = x / y so replace dy = dx * y / x

        --- Equation 2 ---
        Equation 1 = (sqrt(xy + 2ydx + dx^2 * y / x) - sqrt(xy)) / sqrt(xy)

        Multiply by sqrt(x) / sqrt(x)
        Equation 2 = (sqrt(x^2y + 2xydx + dx^2 * y) - sqrt(x^2y)) / sqrt(x^2y)
                   = (sqrt(y)(sqrt(x^2 + 2xdx + dx^2) - sqrt(x^2)) / (sqrt(y)sqrt(x^2))

        sqrt(y) on top and bottom cancels out

        --- Equation 3 ---
        Equation 2 = (sqrt(x^2 + 2xdx + dx^2) - sqrt(x^2)) / (sqrt(x^2)
        = (sqrt((x + dx)^2) - sqrt(x^2)) / sqrt(x^2)
        = ((x + dx) - x) / x
        = dx / x

        Since dx / dy = x / y,
        dx / x = dy / y

        Finally
        (L1 - L0) / L0 = dx / x = dy / y
        */
        if (totalSupply == 0) {
            shares = Math.sqrt(_amount0 * _amount1);
        } else {
            shares = Math.min(
                (_amount0 * totalSupply) / reserve0,
                (_amount1 * totalSupply) / reserve1
            );
        }
        require(shares > 0, "shares = 0");
        _mint(msg.sender, shares);

        _update(
            token0.balanceOf(address(this)),
            token1.balanceOf(address(this))
        );
    }

    function removeLiquidity(
        uint256 _shares
    ) external onlyPremiumOrVip returns (uint256 amount0, uint256 amount1) {
        /*
        Claim
        dx, dy = amount of liquidity to remove
        dx = s / T * x
        dy = s / T * y

        Proof
        Let's find dx, dy such that
        v / L = s / T

        where
        v = f(dx, dy) = sqrt(dxdy)
        L = total liquidity = sqrt(xy)
        s = shares
        T = total supply

        --- Equation 1 ---
        v = s / T * L
        sqrt(dxdy) = s / T * sqrt(xy)

        Amount of liquidity to remove must not change price so
        dx / dy = x / y

        replace dy = dx * y / x
        sqrt(dxdy) = sqrt(dx * dx * y / x) = dx * sqrt(y / x)

        Divide both sides of Equation 1 with sqrt(y / x)
        dx = s / T * sqrt(xy) / sqrt(y / x)
           = s / T * sqrt(x^2) = s / T * x

        Likewise
        dy = s / T * y
        */

        // bal0 >= reserve0
        // bal1 >= reserve1
        uint256 bal0 = token0.balanceOf(address(this));
        uint256 bal1 = token1.balanceOf(address(this));

        amount0 = (_shares * bal0) / totalSupply;
        amount1 = (_shares * bal1) / totalSupply;
        require(amount0 > 0 && amount1 > 0, "amount0 or amount1 = 0");

        _burn(msg.sender, _shares);
        _update(bal0 - amount0, bal1 - amount1);

        token0.transfer(msg.sender, amount0);
        token1.transfer(msg.sender, amount1);
    }

    function getUserFee(address user) public view returns (uint256) {
        if (userFeeTier[user] == 1) {
            return PREMIUM_FEE;
        } else if (userFeeTier[user] == 2) {
            return VIP_FEE;
        }
        return BASIC_FEE;
    }

    function _getUserLimit(address user) private view returns (uint256) {
        if (userFeeTier[user] == 1) {
            return PREMIUM_LIMIT;
        } else if (userFeeTier[user] == 2) {
            return VIP_LIMIT;
        }
        return BASIC_LIMIT;
    }

    function _updateDailyVolume(address user, uint256 amount) private {
        uint256 currentDay = block.timestamp / 86400;

        // Reset volume if it's a new day
        if (currentDay > lastTransactionDay[user]) {
            userDailyVolume[user] = 0;
            lastTransactionDay[user] = currentDay;
        }

        uint256 userLimit = _getUserLimit(user);
        require(
            userDailyVolume[user] + amount <= userLimit,
            "Daily limit exceeded"
        );

        userDailyVolume[user] += amount;
    }

    function getRemainingDailyAllowance(
        address user
    ) external view returns (uint256) {
        uint256 currentDay = block.timestamp / 86400;

        // If it's a new day, full allowance is available
        if (currentDay > lastTransactionDay[user]) {
            return _getUserLimit(user);
        }

        uint256 userLimit = _getUserLimit(user);
        if (userDailyVolume[user] >= userLimit) {
            return 0;
        }

        return userLimit - userDailyVolume[user];
    }

    modifier onlyPremiumOrVip() {
        require(
            userFeeTier[msg.sender] == 1 || userFeeTier[msg.sender] == 2,
            "Only VIP or premium users can call this function"
        );
        _;
    }

    modifier onlyVip() {
        require(
            userFeeTier[msg.sender] == 2,
            "Only VIP users can call this function"
        );
        _;
    }
}
