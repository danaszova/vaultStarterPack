// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IStrategyRule.sol";

/**
 * @title StrategyVaultImplementation
 * @dev Upgradable implementation contract for sequential rule-based strategy vaults.
 * All vault proxies point to this implementation. Uses minimal proxy pattern (EIP-1167).
 */
contract StrategyVaultImplementation is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Vault state structure
    struct VaultState {
        bool isLocked;                 // Withdrawal lock (true until rules complete or failsafe)
        uint256 currentRuleIndex;      // Index in rule sequence (0 = first rule)
        uint256 totalDeposited;        // Sum of all deposits (for profit calculation)
        uint256 totalDepositFees;      // Fees taken on deposits
        uint256 unlockTimestamp;       // Configurable failsafe timestamp
        address currentToken;          // Token currently held in vault
        bool completedSuccessfully;    // True if rule sequence completed (not failsafe)
    }

    // Strategy parameters (immutable after initialization)
    struct StrategyParams {
        address depositToken;          // Initial deposit token (can change via swaps)
        uint256 failsafeDuration;      // Seconds until failsafe unlock (e.g., 10 years)
        IStrategyRule[] rules;         // Ordered rule sequence
    }

    // State variables
    VaultState public state;
    StrategyParams public params;
    
    // External addresses
    address public factory;            // VaultProxyFactory address
    address public treasury;           // Treasury address for fee collection
    
    // Owner of the vault
    address public owner;
    
    // Fee parameters (in basis points, where 10000 = 100%)
    uint256 public depositFeeBps;      // e.g., 10 = 0.1%
    uint256 public successFeeBps;      // e.g., 200 = 2%

    // Events
    event Deposited(address indexed depositor, uint256 amount, uint256 fee);
    event RuleExecuted(uint256 indexed ruleIndex, address indexed rule, bool success);
    event RuleSequenceCompleted(uint256 timestamp);
    event Withdrawn(address indexed beneficiary, uint256 amount, uint256 successFee);
    event FailsafeWithdrawn(address indexed beneficiary, uint256 amount);
    event RuleAdded(address indexed rule, uint256 index);
    
    // Modifiers
    modifier onlyFactory() {
        require(msg.sender == factory, "Caller is not factory");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not owner");
        _;
    }

    /**
     * @dev Initialize the vault (called by factory after proxy deployment)
     * @param _owner Address that will own the vault
     * @param depositToken Initial token to deposit
     * @param failsafeDuration Duration in seconds until failsafe unlock
     * @param _factory VaultProxyFactory address
     * @param _treasury Treasury address for fee collection
     * @param _depositFeeBps Deposit fee in basis points
     * @param _successFeeBps Success fee in basis points
     * @param initialRules Array of initial rules in the sequence
     */
    function initialize(
        address _owner,
        address depositToken,
        uint256 failsafeDuration,
        address _factory,
        address _treasury,
        uint256 _depositFeeBps,
        uint256 _successFeeBps,
        IStrategyRule[] memory initialRules
    ) external {
        // Can only be initialized once (factory calls this)
        require(factory == address(0), "Already initialized");
        require(_owner != address(0), "Invalid owner");
        require(depositToken != address(0), "Invalid deposit token");
        require(failsafeDuration >= 1 days, "Failsafe must be at least 1 day");
        require(failsafeDuration <= 100 * 365 days, "Failsafe too long (max 100 years)");
        require(_factory != address(0), "Invalid factory");
        require(_treasury != address(0), "Invalid treasury");
        require(_depositFeeBps <= 100, "Deposit fee too high (max 1%)"); // 100 bps = 1%
        require(_successFeeBps <= 1000, "Success fee too high (max 10%)"); // 1000 bps = 10%

        // Set ownership
        owner = _owner;

        // Set parameters
        params.depositToken = depositToken;
        params.failsafeDuration = failsafeDuration;
        
        // Add initial rules
        for (uint256 i = 0; i < initialRules.length; i++) {
            require(address(initialRules[i]) != address(0), "Invalid rule");
            params.rules.push(initialRules[i]);
        }

        // Set external addresses and fees
        factory = _factory;
        treasury = _treasury;
        depositFeeBps = _depositFeeBps;
        successFeeBps = _successFeeBps;

        // Initialize state
        state.currentToken = depositToken;
        state.unlockTimestamp = block.timestamp + failsafeDuration;
        state.isLocked = true; // Vault starts locked (withdrawal-only lock)
    }

    /**
     * @dev Deposit funds into the vault (always allowed, even if vault is unlocked)
     * @param amount Amount of current token to deposit
     */
    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");

        IERC20 token = IERC20(state.currentToken);
        
        // Calculate deposit fee
        uint256 fee = (amount * depositFeeBps) / 10000;
        uint256 netAmount = amount - fee;
        
        // Transfer tokens from sender
        token.safeTransferFrom(msg.sender, address(this), amount);
        
        // Send fee to treasury
        if (fee > 0) {
            token.safeTransfer(treasury, fee);
        }
        
        // Update state
        state.totalDeposited += netAmount;
        state.totalDepositFees += fee;
        
        emit Deposited(msg.sender, netAmount, fee);
    }

    /**
     * @dev Check if current rule's condition is met
     * @return True if condition is met, false otherwise
     */
    function checkCurrentRule() external view returns (bool) {
        if (state.currentRuleIndex >= params.rules.length) {
            return false; // No more rules
        }
        IStrategyRule rule = params.rules[state.currentRuleIndex];
        return rule.checkCondition(address(this));
    }

    /**
     * @dev Execute the current rule (anyone can call when condition is met)
     */
    function executeCurrentRule() external nonReentrant {
        require(state.isLocked, "Vault already unlocked");
        require(state.currentRuleIndex < params.rules.length, "No more rules to execute");
        
        IStrategyRule rule = params.rules[state.currentRuleIndex];
        require(rule.checkCondition(address(this)), "Rule condition not met");

        // Execute rule action
        (bool success, uint256 nextRuleIndex) = rule.executeAction(address(this));
        require(success, "Rule execution failed");

        emit RuleExecuted(state.currentRuleIndex, address(rule), success);

        // Update current token if rule changes it
        address targetToken = rule.getTargetToken();
        if (targetToken != address(0)) {
            state.currentToken = targetToken;
        }

        // Update rule index (allow conditional jumps via nextRuleIndex)
        if (nextRuleIndex > state.currentRuleIndex) {
            state.currentRuleIndex = nextRuleIndex;
        } else {
            // Default: move to next rule in sequence
            state.currentRuleIndex++;
        }

        // Check if rule sequence is complete
        if (state.currentRuleIndex >= params.rules.length) {
            state.isLocked = false;
            state.completedSuccessfully = true;
            emit RuleSequenceCompleted(block.timestamp);
        }
    }

    /**
     * @dev Withdraw funds after rule sequence completion (success fee applies)
     */
    function withdraw() external nonReentrant onlyOwner {
        require(!state.isLocked, "Vault is still locked");
        require(state.completedSuccessfully, "Vault not completed successfully (use failsafe)");

        IERC20 token = IERC20(state.currentToken);
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No funds to withdraw");

        // Calculate profit: final balance - total deposited - deposit fees already taken
        uint256 profit = 0;
        if (balance > state.totalDeposited) {
            profit = balance - state.totalDeposited;
        }

        uint256 successFee = 0;
        uint256 userAmount = balance;

        if (profit > 0) {
            successFee = (profit * successFeeBps) / 10000;
            userAmount = balance - successFee;
            
            // Transfer success fee to treasury
            if (successFee > 0) {
                token.safeTransfer(treasury, successFee);
            }
        }

        // Transfer remaining balance to owner
        token.safeTransfer(owner, userAmount);

        emit Withdrawn(owner, userAmount, successFee);
    }

    /**
     * @dev Withdraw via failsafe timer (no success fee)
     */
    function withdrawViaFailsafe() external nonReentrant onlyOwner {
        require(state.isLocked, "Vault not locked");
        require(block.timestamp >= state.unlockTimestamp, "Failsafe timer not expired");

        IERC20 token = IERC20(state.currentToken);
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No funds to withdraw");

        // No success fee on failsafe withdrawal
        token.safeTransfer(owner, balance);

        state.isLocked = false; // Mark as unlocked
        state.completedSuccessfully = false; // Not a successful completion

        emit FailsafeWithdrawn(owner, balance);
    }

    /**
     * @dev Add a new rule to the sequence (owner can add rules while vault is locked)
     * @param rule The rule contract to add
     */
    function addRule(IStrategyRule rule) external onlyOwner {
        require(state.isLocked, "Cannot add rules after vault unlocked");
        require(address(rule) != address(0), "Invalid rule");

        params.rules.push(rule);
        emit RuleAdded(address(rule), params.rules.length - 1);
    }

    /**
     * @dev Get current vault status
     * @return isLocked Whether vault is locked
     * @return currentRuleIndex Index of current rule
     * @return timeUntilFailsafe Seconds until failsafe unlock
     * @return currentToken Token currently held in vault
     * @return completedSuccessfully Whether rule sequence completed successfully
     */
    function getStatus() external view returns (
        bool isLocked,
        uint256 currentRuleIndex,
        uint256 timeUntilFailsafe,
        address currentToken,
        bool completedSuccessfully
    ) {
        isLocked = state.isLocked;
        currentRuleIndex = state.currentRuleIndex;
        timeUntilFailsafe = state.unlockTimestamp > block.timestamp 
            ? state.unlockTimestamp - block.timestamp 
            : 0;
        currentToken = state.currentToken;
        completedSuccessfully = state.completedSuccessfully;
    }

    /**
     * @dev Get all rules in the sequence
     * @return Array of rule addresses
     */
    function getRules() external view returns (IStrategyRule[] memory) {
        return params.rules;
    }

    /**
     * @dev Get current vault balance
     * @return Balance of current token
     */
    function getBalance() external view returns (uint256) {
        return IERC20(state.currentToken).balanceOf(address(this));
    }

    /**
     * @dev Get profit calculation details
     * @return totalDeposited Total net deposits (after deposit fees)
     * @return currentBalance Current token balance
     * @return profit Calculated profit (balance - totalDeposited, if positive)
     */
    function getProfitDetails() external view returns (
        uint256 totalDeposited,
        uint256 currentBalance,
        uint256 profit
    ) {
        totalDeposited = state.totalDeposited;
        currentBalance = IERC20(state.currentToken).balanceOf(address(this));
        if (currentBalance > totalDeposited) {
            profit = currentBalance - totalDeposited;
        } else {
            profit = 0;
        }
    }

    // Helper function for rules to access vault's token balance (if needed)
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    // Helper function for rules to perform token transfers (e.g., for swaps)
    // This allows rules to move tokens on behalf of the vault, but only if called by a rule
    function transferToken(address token, address to, uint256 amount) external returns (bool) {
        // Only allow rules in the sequence to call this
        bool isRule = false;
        for (uint256 i = 0; i < params.rules.length; i++) {
            if (address(params.rules[i]) == msg.sender) {
                isRule = true;
                break;
            }
        }
        require(isRule, "Caller is not a rule");
        
        IERC20(token).safeTransfer(to, amount);
        return true;
    }
}
