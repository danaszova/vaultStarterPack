// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IStrategyRule.sol";

/**
 * @title VaultProxyFactory
 * @dev Factory for deploying minimal proxy vaults (EIP-1167) that point to an upgradable implementation.
 * All vaults share the same implementation logic, which can be upgraded by governance.
 */
contract VaultProxyFactory is Ownable {
    using Clones for address;
    
    // Address of the current implementation contract
    address public implementation;
    
    // Array of all deployed vault proxies
    address[] public deployedVaults;
    
    // Treasury address for fee collection
    address public treasury;
    
    // Fee parameters (in basis points, where 10000 = 100%)
    uint256 public depositFeeBps;  // e.g., 10 = 0.1%
    uint256 public successFeeBps;  // e.g., 200 = 2%
    
    // Events
    event VaultCreated(
        address indexed proxy,
        address indexed owner,
        address depositToken,
        uint256 failsafeDuration,
        uint256 vaultId
    );
    
    event ImplementationUpgraded(address newImplementation);
    event TreasuryUpdated(address newTreasury);
    event FeesUpdated(uint256 depositFeeBps, uint256 successFeeBps);
    
    /**
     * @dev Constructor
     * @param _implementation Initial implementation address
     * @param _treasury Treasury address for fee collection
     * @param _depositFeeBps Deposit fee in basis points (e.g., 10 = 0.1%)
     * @param _successFeeBps Success fee in basis points (e.g., 200 = 2%)
     */
    constructor(
        address _implementation,
        address _treasury,
        uint256 _depositFeeBps,
        uint256 _successFeeBps
    ) Ownable(msg.sender) {
        require(_implementation != address(0), "Invalid implementation");
        require(_treasury != address(0), "Invalid treasury");
        
        implementation = _implementation;
        treasury = _treasury;
        depositFeeBps = _depositFeeBps;
        successFeeBps = _successFeeBps;
    }
    
    /**
     * @dev Create a new vault proxy with the given parameters
     * @param owner Address that will own the vault
     * @param depositToken Initial token to deposit (can be changed later via swaps)
     * @param failsafeDuration Duration in seconds until failsafe unlock (e.g., 10 years = 315360000)
     * @param initialRules Array of initial rules in the sequence
     * @return vaultProxy Address of the deployed proxy vault
     */
    function createVault(
        address owner,
        address depositToken,
        uint256 failsafeDuration,
        IStrategyRule[] memory initialRules
    ) external returns (address vaultProxy) {
        require(owner != address(0), "Invalid owner");
        require(depositToken != address(0), "Invalid deposit token");
        require(failsafeDuration >= 1 days, "Failsafe must be at least 1 day");
        require(failsafeDuration <= 100 * 365 days, "Failsafe too long (max 100 years)");
        
        // Deploy minimal proxy pointing to implementation
        vaultProxy = implementation.clone();
        
        // Initialize the proxy with parameters
        (bool success, ) = vaultProxy.call(
            abi.encodeWithSignature(
                "initialize(address,address,uint256,address,address,uint256,uint256,address[])",
                owner,
                depositToken,
                failsafeDuration,
                address(this), // factory
                treasury,
                depositFeeBps,
                successFeeBps,
                initialRules
            )
        );
        require(success, "Initialization failed");
        
        // Track deployed vault
        deployedVaults.push(vaultProxy);
        
        emit VaultCreated(
            vaultProxy,
            owner,
            depositToken,
            failsafeDuration,
            deployedVaults.length - 1
        );
        
        return vaultProxy;
    }
    
    /**
     * @dev Upgrade the implementation address (governance only)
     * @param newImplementation Address of the new implementation
     */
    function upgradeImplementation(address newImplementation) external onlyOwner {
        require(newImplementation != address(0), "Invalid implementation");
        implementation = newImplementation;
        emit ImplementationUpgraded(newImplementation);
    }
    
    /**
     * @dev Update treasury address (governance only)
     * @param newTreasury New treasury address
     */
    function updateTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury");
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }
    
    /**
     * @dev Update fee parameters (governance only)
     * @param newDepositFeeBps New deposit fee in basis points
     * @param newSuccessFeeBps New success fee in basis points
     */
    function updateFees(uint256 newDepositFeeBps, uint256 newSuccessFeeBps) external onlyOwner {
        require(newDepositFeeBps <= 100, "Deposit fee too high (max 1%)"); // 100 bps = 1%
        require(newSuccessFeeBps <= 1000, "Success fee too high (max 10%)"); // 1000 bps = 10%
        
        depositFeeBps = newDepositFeeBps;
        successFeeBps = newSuccessFeeBps;
        
        emit FeesUpdated(newDepositFeeBps, newSuccessFeeBps);
    }
    
    /**
     * @dev Get the total number of deployed vaults
     * @return count Number of deployed vaults
     */
    function getVaultCount() external view returns (uint256) {
        return deployedVaults.length;
    }
    
    /**
     * @dev Get vault address by index
     * @param index Index of the vault
     * @return vaultAddress Address of the vault at the given index
     */
    function getVault(uint256 index) external view returns (address) {
        require(index < deployedVaults.length, "Index out of bounds");
        return deployedVaults[index];
    }
    
    /**
     * @dev Get all deployed vaults
     * @return vaults Array of all deployed vault addresses
     */
    function getAllVaults() external view returns (address[] memory) {
        return deployedVaults;
    }
}
