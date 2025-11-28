// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title HODLLock
 * @dev Holds assets and manages time-locks. Controlled by LegacyVaultHub.
 */
contract HODLLock is Ownable {
    struct LockInfo {
        uint256 amount;
        uint256 releaseTime;
    }

    // beneficiary -> token -> LockInfo
    mapping(address => mapping(address => LockInfo)) public locks;

    event Locked(address indexed beneficiary, address indexed token, uint256 amount, uint256 releaseTime);
    event Withdrawn(address indexed beneficiary, address indexed token, uint256 amount);

    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @dev Lock tokens for a beneficiary. Only callable by owner (Hub).
     * @param beneficiary The address to lock funds for.
     * @param token The token address.
     * @param amount The amount to lock.
     * @param duration The duration of the lock in seconds.
     */
    function lock(
        address beneficiary,
        address token,
        uint256 amount,
        uint256 duration
    ) external onlyOwner {
        require(amount > 0, "Amount must be > 0");
        require(token != address(0), "Invalid token");

        // Transfer tokens from Hub (msg.sender) to this contract
        IERC20(token).transferFrom(msg.sender, address(this), amount);

        LockInfo storage info = locks[beneficiary][token];
        info.amount += amount;
        
        // Extend release time if new lock is longer, or set if new
        uint256 newReleaseTime = block.timestamp + duration;
        if (newReleaseTime > info.releaseTime) {
            info.releaseTime = newReleaseTime;
        }

        emit Locked(beneficiary, token, amount, info.releaseTime);
    }

    /**
     * @dev Withdraw tokens after lock period. Callable by beneficiary.
     * @param token The token address to withdraw.
     */
    function withdraw(address token) external {
        LockInfo storage info = locks[msg.sender][token];
        require(info.amount > 0, "No funds to withdraw");
        require(block.timestamp >= info.releaseTime, "Funds are still locked");

        uint256 amount = info.amount;
        info.amount = 0;

        IERC20(token).transfer(msg.sender, amount);
        emit Withdrawn(msg.sender, token, amount);
    }
    
    /**
     * @dev Get lock details.
     */
    function getLockDetails(address beneficiary, address token) external view returns (uint256 amount, uint256 releaseTime) {
        LockInfo memory info = locks[beneficiary][token];
        return (info.amount, info.releaseTime);
    }
}
