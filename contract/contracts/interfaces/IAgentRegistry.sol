// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IAgentRegistry
 * @notice Interface for the Agent Registry contract
 */
interface IAgentRegistry {
    struct Agent {
        address owner;
        address wallet;          // Derived agent wallet for receiving payments
        uint256 pricePerCall;
        string metadataURI;
        bool active;
        uint256 totalEarnings;
        uint256 totalJobs;
    }

    event AgentRegistered(
        uint256 indexed agentId,
        address indexed owner,
        address wallet,
        uint256 pricePerCall,
        string metadataURI
    );

    event AgentUpdated(
        uint256 indexed agentId,
        uint256 newPrice,
        bool active,
        string metadataURI
    );

    function registerAgent(
        uint256 pricePerCall,
        string calldata metadataURI,
        address wallet
    ) external returns (uint256 agentId);

    function updateAgent(
        uint256 agentId,
        uint256 newPrice,
        bool active,
        string calldata metadataURI
    ) external;

    function incrementAgentStats(
        uint256 agentId,
        uint256 earnings
    ) external;

    function getAgent(uint256 agentId) external view returns (Agent memory);
    function getAgentOwner(uint256 agentId) external view returns (address);
    function getAgentWallet(uint256 agentId) external view returns (address);
    function getAgentPrice(uint256 agentId) external view returns (uint256);
    function isAgentActive(uint256 agentId) external view returns (bool);
    function agentCount() external view returns (uint256);
    function getAgentsByOwner(address owner) external view returns (uint256[] memory);
    function getPlatformStats() external view returns (
        uint256 _agentCount,
        uint256 _totalEarnings,
        uint256 _totalJobs
    );
}
