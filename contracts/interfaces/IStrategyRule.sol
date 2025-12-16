// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IStrategyRule
 * @dev Extended interface for sequential strategy rules with condition checking and action execution.
 * Rules are executed in order (if-else chain) and must implement both condition checking and action execution.
 */
interface IStrategyRule {
    /**
     * @dev Check if the rule's condition is satisfied
     * @param vault The address of the vault checking the rule
     * @return True if condition is met, false otherwise
     */
    function checkCondition(address vault) external view returns (bool);

    /**
     * @dev Execute the rule's action (swap, wait, cross-chain move, etc.)
     * @param vault The address of the vault executing the rule
     * @return success True if action executed successfully
     * @return nextRuleIndex The index of the next rule to execute (allows for conditional jumps)
     */
    function executeAction(address vault) external returns (bool success, uint256 nextRuleIndex);

    /**
     * @dev Get a human-readable description of the rule
     * @return Description string
     */
    function getDescription() external view returns (string memory);

    /**
     * @dev Get the target token after rule execution (if applicable)
     * @return The address of the token the vault will hold after this rule executes
     *         Returns address(0) if rule doesn't change token (e.g., TimeLockRule)
     */
    function getTargetToken() external view returns (address);
}
