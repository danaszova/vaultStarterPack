// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {LinkTokenInterface} from "@chainlink/contracts/src/v0.8/shared/interfaces/LinkTokenInterface.sol";
import "./interfaces/IRule.sol";

import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

/**
 * @title StrategyVault
 * @dev A customizable strategy vault that executes trades and sends cross-chain messages.
 */
contract StrategyVault is ReentrancyGuard, Ownable, AutomationCompatibleInterface {
    // Strategy parameters
    struct StrategyParams {
        string name;               // User-defined name for the vault
        address inputAsset;        // Input token (e.g., USDC)
        address targetAsset;       // Target token (e.g., AVAX)
        uint256 executionAmount;   // Amount to execute
        uint256 lockPeriod;        // Lock period in seconds (for destination)
        address beneficiary;       // Final recipient
        address router;            // CCIP Router
        address hub;               // Hub address on destination chain
        uint64 destinationChainSelector; // Chain selector for destination
        address linkToken;         // LINK token address for fees
        IRule[] rules;             // Array of execution rules (AND logic)
    }

    // Vault state
    StrategyParams public params;
    uint256 public totalDeposited;
    uint256 public lastExecutionTime;
    uint256 public releaseTime;
    uint256 public deploymentTime;
    bool public executed;
    bool public locked;

    // Events
    event Deposited(address indexed depositor, uint256 amount);
    event StrategyExecuted(uint256 timestamp, uint256 amount, bytes32 messageId);
    event Withdrawn(address indexed beneficiary, uint256 amount);

    /**
     * @dev Initialize the strategy vault with custom parameters
     * @param _params Strategy configuration parameters
     */
    constructor(StrategyParams memory _params) Ownable(_params.beneficiary) {
        require(_params.inputAsset != address(0), "Invalid input asset");
        require(_params.targetAsset != address(0), "Invalid target asset");
        require(_params.executionAmount > 0, "Invalid execution amount"); // Allow 0 for data-only messages
        require(_params.beneficiary != address(0), "Invalid beneficiary");
        require(_params.router != address(0), "Invalid router");
        require(_params.hub != address(0), "Invalid hub");

        params = _params;
        deploymentTime = block.timestamp;
        // transferOwnership is not needed as we pass beneficiary to Ownable constructor
    }

    /**
     * @dev Deposit funds into the strategy vault
     * @param amount Amount of input asset to deposit
     */
    function deposit(uint256 amount) external nonReentrant {
        require(!executed, "Strategy already executed");
        require(amount > 0, "Amount must be greater than 0");

        // Transfer tokens from sender to vault
        IERC20 inputToken = IERC20(params.inputAsset);
        require(inputToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        totalDeposited += amount;
        emit Deposited(msg.sender, amount);
    }

    /**
     * @dev Check if strategy conditions are met
     * @return bool True if conditions are met
     */
    function checkConditions() public view returns (bool) {
        if (executed) return false;
        if (params.rules.length == 0) return true; // No rules = immediate execution
        
        for (uint256 i = 0; i < params.rules.length; i++) {
            if (!params.rules[i].check(address(this))) {
                return false;
            }
        }
        return true;
    }

    /**
     * @dev Chainlink Automation: Check if upkeep is needed
     * @return upkeepNeeded True if conditions are met and not executed
     * @return performData Empty bytes
     */
    function checkUpkeep(
        bytes calldata /* checkData */
    ) external view override returns (bool upkeepNeeded, bytes memory performData) {
        upkeepNeeded = !executed && checkConditions() && totalDeposited >= params.executionAmount;
        performData = "";
    }

    /**
     * @dev Chainlink Automation: Perform upkeep (execute strategy)
     */
    function performUpkeep(
        bytes calldata /* performData */
    ) external override {
        // We call executeStrategy directly. 
        // Note: executeStrategy is public/external, so anyone can call it.
        // The checks inside executeStrategy prevent abuse.
        executeStrategy();
    }

    /**
     * @dev Execute the strategy when conditions are met and send CCIP message
     */
    function executeStrategy() public nonReentrant {
        require(!executed, "Strategy already executed");
        require(checkConditions(), "Conditions not met");
        require(totalDeposited >= params.executionAmount, "Insufficient funds");

        // Mark as executed and set lock period
        executed = true;
        lastExecutionTime = block.timestamp;
        releaseTime = block.timestamp + params.lockPeriod;
        locked = true;

        // Approve router to spend input asset (bridging funds)
        if (params.executionAmount > 0) {
            IERC20(params.inputAsset).approve(params.router, params.executionAmount);
        }

        // Construct the CCIP message
        Client.EVM2AnyMessage memory evm2AnyMessage = _buildCCIPMessage(
            params.inputAsset,
            params.executionAmount
        );

        // Initialize router
        IRouterClient router = IRouterClient(params.router);

        // Get fee required
        uint256 fees = router.getFee(params.destinationChainSelector, evm2AnyMessage);

        // Approve LINK for fees
        LinkTokenInterface link = LinkTokenInterface(params.linkToken);
        require(link.balanceOf(address(this)) >= fees, "Insufficient LINK for fees");
        link.approve(params.router, fees);

        // Send message
        bytes32 messageId = router.ccipSend(params.destinationChainSelector, evm2AnyMessage);

        emit StrategyExecuted(block.timestamp, params.executionAmount, messageId);
    }

    function _buildCCIPMessage(
        address _token,
        uint256 _amount
    ) internal view returns (Client.EVM2AnyMessage memory) {
        Client.EVMTokenAmount[] memory tokenAmounts;
        
        if (_amount > 0) {
            tokenAmounts = new Client.EVMTokenAmount[](1);
            tokenAmounts[0] = Client.EVMTokenAmount({
                token: _token,
                amount: _amount
            });
        } else {
            tokenAmounts = new Client.EVMTokenAmount[](0);
        }

        return Client.EVM2AnyMessage({
            receiver: abi.encode(params.hub),
            data: abi.encode(params.beneficiary, params.lockPeriod),
            tokenAmounts: tokenAmounts,
            extraArgs: Client._argsToBytes(
                Client.EVMExtraArgsV1({gasLimit: 200_000})
            ),
            feeToken: params.linkToken
        });
    }

    /**
     * @dev Withdraw funds after lock period
     */
    function withdraw() external nonReentrant onlyOwner {
        require(executed, "Strategy not executed");
        require(block.timestamp >= releaseTime, "Lock period not ended");

        IERC20 inputToken = IERC20(params.inputAsset);
        uint256 balance = inputToken.balanceOf(address(this));
        require(balance > 0, "No funds to withdraw");

        require(inputToken.transfer(owner(), balance), "Withdrawal failed");
        locked = false;

        emit Withdrawn(owner(), balance);
    }

    /**
     * @dev Emergency withdraw if strategies fail (10 year fallback)
     */
    function emergencyWithdraw() external nonReentrant onlyOwner {
        require(!executed, "Strategy already executed");
        require(block.timestamp >= deploymentTime + 3650 days, "Emergency lock not expired");

        IERC20 inputToken = IERC20(params.inputAsset);
        uint256 balance = inputToken.balanceOf(address(this));
        require(balance > 0, "No funds to withdraw");

        require(inputToken.transfer(owner(), balance), "Withdrawal failed");
        emit Withdrawn(owner(), balance);
    }

    /**
     * @dev Withdraw LINK tokens (emergency or leftover)
     */
    function withdrawLink() external onlyOwner {
        LinkTokenInterface link = LinkTokenInterface(params.linkToken);
        uint256 balance = link.balanceOf(address(this));
        require(link.transfer(msg.sender, balance), "LINK withdrawal failed");
    }

    /**
     * @dev Get current vault balance
     */
    function getBalance() external view returns (uint256) {
        return IERC20(params.inputAsset).balanceOf(address(this));
    }

    /**
     * @dev Get strategy status
     */
    function getStatus() external view returns (bool executed_, bool locked_, uint256 timeRemaining) {
        executed_ = executed;
        locked_ = locked;
        timeRemaining = locked && block.timestamp < releaseTime ? releaseTime - block.timestamp : 0;
    }

    /**
     * @dev Get all rules attached to this vault
     */
    function getRules() external view returns (IRule[] memory) {
        return params.rules;
    }

    /**
     * @dev Add a new rule to the strategy
     * @param _rule The rule contract to add
     */
    function addRule(IRule _rule) external onlyOwner {
        require(address(_rule) != address(0), "Invalid rule address");
        params.rules.push(_rule);
    }
}
