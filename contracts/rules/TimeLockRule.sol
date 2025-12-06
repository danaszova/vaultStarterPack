// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IRule.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title TimeLockRule
 * @dev Rule that checks if a specific time has passed
 */
contract TimeLockRule is IRule {
    using Strings for uint256;
    uint256 public unlockTime;

    constructor(uint256 _endTime) {
        unlockTime = _endTime;
    }

    function check(address /* _vault */) external view override returns (bool) {
        return block.timestamp >= unlockTime;
    }

    function getDescription() external view override returns (string memory) {
        return string(abi.encodePacked("TimeLock: Unlocks at timestamp ", unlockTime.toString()));
    }
}
