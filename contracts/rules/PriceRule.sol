// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IRule.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title PriceRule
 * @dev Rule that checks if an asset price meets a target condition using Chainlink Oracles
 */
contract PriceRule is IRule {
    using Strings for uint256;

    AggregatorV3Interface public oracle;
    uint256 public targetPrice;
    bool public isGreaterThan; // true for >, false for <

    constructor(address _oracle, uint256 _targetPrice, bool _isGreaterThan) {
        oracle = AggregatorV3Interface(_oracle);
        targetPrice = _targetPrice;
        isGreaterThan = _isGreaterThan;
    }

    function check(address /* vault */) external view override returns (bool) {
        (, int256 price, , , ) = oracle.latestRoundData();
        require(price > 0, "Invalid price");
        
        if (isGreaterThan) {
            return uint256(price) > targetPrice;
        } else {
            return uint256(price) < targetPrice;
        }
    }

    function getDescription() external view override returns (string memory) {
        string memory operator = isGreaterThan ? ">" : "<";
        return string(abi.encodePacked("Price: Current ", operator, " ", targetPrice.toString()));
    }
}
