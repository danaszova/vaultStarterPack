// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockChainlinkAggregator
 * @dev Mock Chainlink Aggregator for local testing of price feeds
 * Simulates the behavior of real Chainlink price feeds
 */
contract MockChainlinkAggregator {
    struct RoundData {
        int256 answer;
        uint256 updatedAt;
        uint256 startedAt;
        uint80 answeredInRound;
    }

    uint8 public decimals;
    string public description;
    uint256 public version;
    
    mapping(uint80 => RoundData) public rounds;
    uint80 public latestRound;
    
    // Events
    event AnswerUpdated(int256 indexed current, uint256 indexed roundId, uint256 updatedAt);

    constructor(uint8 _decimals, string memory _description) {
        decimals = _decimals;
        description = _description;
        version = 1;
        
        // Initialize with a default round
        rounds[1] = RoundData({
            answer: int256(2000 * 10**uint256(_decimals)), // $2000 price
            updatedAt: block.timestamp,
            startedAt: block.timestamp,
            answeredInRound: 1
        });
        latestRound = 1;
    }

    /**
     * @dev Get the latest round data
     * @return roundId The round ID
     * @return answer The price
     * @return startedAt Timestamp when round started
     * @return updatedAt Timestamp when round was updated
     * @return answeredInRound The round ID of the round in which the answer was computed
     */
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        RoundData memory round = rounds[latestRound];
        return (latestRound, round.answer, round.startedAt, round.updatedAt, round.answeredInRound);
    }

    /**
     * @dev Get round data for a specific round
     * @param _roundId The round ID
     */
    function getRoundData(uint80 _roundId)
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        RoundData memory round = rounds[_roundId];
        require(round.updatedAt > 0, "No data present");
        return (_roundId, round.answer, round.startedAt, round.updatedAt, round.answeredInRound);
    }

    /**
     * @dev Update the price for testing purposes
     * @param newPrice The new price (with decimals)
     */
    function updatePrice(int256 newPrice) external {
        latestRound++;
        rounds[latestRound] = RoundData({
            answer: newPrice,
            updatedAt: block.timestamp,
            startedAt: block.timestamp,
            answeredInRound: latestRound
        });
        
        emit AnswerUpdated(newPrice, latestRound, block.timestamp);
    }

    /**
     * @dev Update the price with a specific timestamp for testing
     * @param newPrice The new price (with decimals)
     * @param timestamp The timestamp to set
     */
    function updatePriceWithTimestamp(int256 newPrice, uint256 timestamp) external {
        latestRound++;
        rounds[latestRound] = RoundData({
            answer: newPrice,
            updatedAt: timestamp,
            startedAt: timestamp,
            answeredInRound: latestRound
        });
        
        emit AnswerUpdated(newPrice, latestRound, timestamp);
    }
}
