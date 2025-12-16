// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IStrategyRule.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title TimeLockRule
 * @dev Rule that waits until a specific timestamp, then proceeds to next rule
 */
contract TimeLockRule is IStrategyRule {
    using Strings for uint256;
    uint256 public unlockTime;

    constructor(uint256 _endTime) {
        unlockTime = _endTime;
    }

    /**
     * @dev Check if the current time has passed the unlock timestamp
     */
    function checkCondition(address /* vault */) external view override returns (bool) {
        return block.timestamp >= unlockTime;
    }

    /**
     * @dev Execute the rule (no action needed, just proceed to next rule)
     * @return success Always returns true
     * @return nextRuleIndex Returns currentRuleIndex + 1 to proceed to next rule
     */
    function executeAction(address /* vault */) external override returns (bool success, uint256 nextRuleIndex) {
        // For TimeLockRule, there's no action to perform, just move to next rule.
        // We return the next rule index as the current index + 1.
        // The vault will update the rule index accordingly.
        // However, we don't have access to the current rule index here.
        // The vault will handle the increment. We can return 0 and let the vault increment by 1.
        // The vault's default behavior is to increment by 1 unless we return a different nextRuleIndex.
        // Since we don't know the current index, we return 0 and the vault will increment by 1.
        // Alternatively, we could return a flag to indicate "increment by 1".
        // The vault's executeCurrentRule function uses: 
        //   if (nextRuleIndex > state.currentRuleIndex) {
        //        state.currentRuleIndex = nextRuleIndex;
        //   } else {
        //        state.currentRuleIndex++;
        //   }
        // So if we return (true, 0), then state.currentRuleIndex will be incremented by 1 (because 0 is not > currentRuleIndex).
        return (true, 0);
    }

    function getDescription() external view override returns (string memory) {
        return string(abi.encodePacked("TimeLock: Unlocks at timestamp ", unlockTime.toString()));
    }

    /**
     * @dev TimeLockRule doesn't change the token
     */
    function getTargetToken() external pure override returns (address) {
        return address(0);
    }
}
