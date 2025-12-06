// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IRule
 * @dev Interface for modular strategy rules
 */
interface IRule {
    /**
     * @dev Check if the rule conditions are met
     * @param _vault The address of the vault checking the rule
     * @return True if conditions are met
     */
    function check(address _vault) external view returns (bool);

    /**
     * @dev Get a human-readable description of the rule
     * @return Description string
     */
    function getDescription() external view returns (string memory);
}
