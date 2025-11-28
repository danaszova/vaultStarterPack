// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {OwnerIsCreator} from "@chainlink/contracts/src/v0.8/shared/access/OwnerIsCreator.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {CCIPReceiver} from "@chainlink/contracts-ccip/contracts/applications/CCIPReceiver.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {HODLLock} from "./HODLLock.sol";

/**
 * @title LegacyVaultHub
 * @dev Hub contract on Ethereum Mainnet that receives cross-chain deposits and messages.
 */
contract LegacyVaultHub is CCIPReceiver, OwnerIsCreator {
    // Custom errors to provide more descriptive revert messages.

    error SenderNotWhitelisted(address sender);
    error InvalidSourceChain(uint64 sourceChainSelector);

    // Event emitted when a message is received from another chain.
    event MessageReceived(
        bytes32 indexed messageId,
        uint64 indexed sourceChainSelector,
        address sender,
        address beneficiary,
        uint256 lockPeriod
    );

    // Mapping to keep track of whitelisted spoke vaults on other chains.
    mapping(address => bool) public whitelistedSpokes;
    
    // HODLLock contract address
    HODLLock public hodlLock;

    /**
     * @notice Constructor initializes the contract with the router address.
     * @param _router The address of the CCIP router contract.
     */
    constructor(address _router) CCIPReceiver(_router) {
        if (_router == address(0)) revert InvalidRouter(address(0));
    }

    /**
     * @dev Modifier to allow only whitelisted spokes to send messages.
     * @param _sender The address of the sender on the source chain.
     */
    modifier onlyWhitelisted(address _sender) {
        if (!whitelistedSpokes[_sender]) revert SenderNotWhitelisted(_sender);
        _;
    }

    /**
     * @notice Whitelists a spoke vault address.
     * @param _spoke The address of the spoke vault to whitelist.
     * @param _status True to whitelist, false to remove.
     */
    function setSpokeStatus(address _spoke, bool _status) external onlyOwner {
        whitelistedSpokes[_spoke] = _status;
    }

    /**
     * @notice Sets the HODLLock contract address.
     * @param _hodlLock The address of the HODLLock contract.
     */
    function setHodlLock(address _hodlLock) external onlyOwner {
        hodlLock = HODLLock(_hodlLock);
    }

    /**
     * @notice Handles incoming cross-chain messages.
     * @dev _ccipReceive is an internal function that is called by the CCIP router.
     * @param any2EvmMessage The message received from the CCIP router.
     */
    function _ccipReceive(
        Client.Any2EVMMessage memory any2EvmMessage
    ) internal override {
        // Decode the message sender
        address sender = abi.decode(any2EvmMessage.sender, (address));

        // Verify the sender is a whitelisted spoke
        if (!whitelistedSpokes[sender]) revert SenderNotWhitelisted(sender);

        // Decode the message data
        (address beneficiary, uint256 lockPeriod) = abi.decode(any2EvmMessage.data, (address, uint256));

        // Process transferred tokens
        if (any2EvmMessage.destTokenAmounts.length > 0) {
            for (uint256 i = 0; i < any2EvmMessage.destTokenAmounts.length; ++i) {
                Client.EVMTokenAmount memory tokenAmount = any2EvmMessage.destTokenAmounts[i];
                
                // Approve HODLLock to spend tokens
                IERC20(tokenAmount.token).approve(address(hodlLock), tokenAmount.amount);
                
                // Lock tokens
                hodlLock.lock(beneficiary, tokenAmount.token, tokenAmount.amount, lockPeriod);
            }
        }

        emit MessageReceived(
            any2EvmMessage.messageId,
            any2EvmMessage.sourceChainSelector,
            sender,
            beneficiary,
            lockPeriod
        );
    }
}
