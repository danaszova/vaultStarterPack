// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IStrategyRule.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title PerformanceRule
 * @dev Rule that checks if the vault's balance has reached a target amount
 */
contract PerformanceRule is IStrategyRule {
    using Strings for uint256;
    IERC20 public token;
    uint256 public targetBalance;

    constructor(address _token, uint256 _targetBalance) {
        token = IERC20(_token);
        targetBalance = _targetBalance;
    }

    /**
     * @dev Check if the vault's balance of the specified token meets or exceeds the target
     */
    function checkCondition(address _vault) external view override returns (bool) {
        uint256 currentBalance = IERC20(token).balanceOf(_vault);
        return currentBalance >= targetBalance;
    }

    /**
     * @dev Execute the rule (no action needed, just proceed to next rule)
     */
    function executeAction(address /* vault */) external override returns (bool success, uint256 nextRuleIndex) {
        // PerformanceRule doesn't perform an action, just moves to next rule.
        return (true, 0);
    }

    function getDescription() external view override returns (string memory) {
        return string(abi.encodePacked("Performance: Balance >= ", targetBalance.toString()));
    }

    /**
     * @dev PerformanceRule doesn't change the token (it checks balance of a token)
     */
    function getTargetToken() external pure override returns (address) {
        return address(0);
    }
}
