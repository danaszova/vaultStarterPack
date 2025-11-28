// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockCCIPRouter {
    event MessageSent(uint64 destinationChainSelector, bytes32 messageId, Client.EVM2AnyMessage message);

    function getFee(
        uint64 destinationChainSelector,
        Client.EVM2AnyMessage memory message
    ) external view returns (uint256 fee) {
        return 0; // Free for mock
    }

    function ccipSend(
        uint64 destinationChainSelector,
        Client.EVM2AnyMessage memory message
    ) external returns (bytes32 messageId) {
        messageId = keccak256(abi.encode(destinationChainSelector, message));
        emit MessageSent(destinationChainSelector, messageId, message);
        return messageId;
    }
}
