// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./StrategyVault.sol";

/**
 * @title StrategyFactory
 * @dev Factory contract for deploying customizable strategy vaults
 */
contract StrategyFactory {
    // Array to track all deployed strategies
    address[] public deployedStrategies;
    
    // Events
    event StrategyCreated(address indexed strategyAddress, address indexed creator, address indexed beneficiary);
    event StrategyExecuted(address indexed strategyAddress, uint256 timestamp);
    
    /**
     * @dev Deploy a new strategy vault with custom parameters
     * @param params Strategy configuration parameters
     * @return strategyAddress Address of the newly deployed strategy vault
     */
    function createStrategy(StrategyVault.StrategyParams memory params) external returns (address) {
        // Create new strategy vault
        StrategyVault strategy = new StrategyVault(params);
        address strategyAddress = address(strategy);
        
        // Track the deployed strategy
        deployedStrategies.push(strategyAddress);
        
        // Emit creation event
        emit StrategyCreated(strategyAddress, msg.sender, params.beneficiary);
        
        return strategyAddress;
    }
    
    /**
     * @dev Get the total number of deployed strategies
     * @return count Number of deployed strategies
     */
    function getStrategyCount() external view returns (uint256) {
        return deployedStrategies.length;
    }
    
    /**
     * @dev Get strategy address by index
     * @param index Index of the strategy
     * @return strategyAddress Address of the strategy at the given index
     */
    function getStrategy(uint256 index) external view returns (address) {
        require(index < deployedStrategies.length, "Index out of bounds");
        return deployedStrategies[index];
    }
    
    /**
     * @dev Get all deployed strategies
     * @return strategies Array of all deployed strategy addresses
     */
    function getAllStrategies() external view returns (address[] memory) {
        return deployedStrategies;
    }
}
