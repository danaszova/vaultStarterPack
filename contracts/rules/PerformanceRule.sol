// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IRule.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title PerformanceRule
 * @dev Rule that checks if the vault's balance has reached a target amount
 */
contract PerformanceRule is IRule {
    using Strings for uint256;
    IERC20 public token;
    uint256 public targetBalance;

    constructor(address _token, uint256 _targetBalance) {
        token = IERC20(_token);
        targetBalance = _targetBalance;
    }

    function check(address _vault) external view override returns (bool) {
        uint256 currentBalance = IERC20(token).balanceOf(_vault);
        return currentBalance >= targetBalance;
    }

    function getDescription() external view override returns (string memory) {
        return string(abi.encodePacked("Performance: Balance >= ", targetBalance.toString()));
    }
}
