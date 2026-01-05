// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IAgentRegistry.sol";

/**
 * @title AgentRegistry
 * @notice Permissionless registry for AI agents
 * @dev Anyone can register an agent, set pricing, and manage lifecycle
 */
contract AgentRegistry is IAgentRegistry, Ownable {
    // ============ State Variables ============

    uint256 public agentCount;
    address public router;
    
    // Global stats
    uint256 public totalPlatformEarnings;
    uint256 public totalPlatformJobs;

    // ============ Mappings ============

    mapping(uint256 => Agent) private _agents;
    mapping(address => uint256[]) private _ownerAgents;

    // ============ Errors ============

    error AgentNotFound();
    error NotAgentOwner();
    error InvalidPrice();
    error OnlyRouter();

    // ============ Modifiers ============

    modifier onlyRouter() {
        if (msg.sender != router) revert OnlyRouter();
        _;
    }

    // ============ Constructor ============

    constructor() Ownable(msg.sender) {}

    // ============ Admin Functions ============

    /**
     * @notice Set the router address (can only be set once or by owner)
     * @param _router Address of the AgentRouter contract
     */
    function setRouter(address _router) external onlyOwner {
        router = _router;
    }

    // ============ Agent Management ============

    /**
     * @notice Register a new agent
     * @param pricePerCall Price per service call in MNEE (wei)
     * @param metadataURI URI pointing to agent metadata JSON
     * @return agentId The ID of the newly registered agent
     */
    function registerAgent(
        uint256 pricePerCall,
        string calldata metadataURI
    ) external returns (uint256 agentId) {
        if (pricePerCall == 0) revert InvalidPrice();

        agentId = agentCount++;

        _agents[agentId] = Agent({
            owner: msg.sender,
            pricePerCall: pricePerCall,
            metadataURI: metadataURI,
            active: true,
            totalEarnings: 0,
            totalJobs: 0
        });

        _ownerAgents[msg.sender].push(agentId);

        emit AgentRegistered(agentId, msg.sender, pricePerCall, metadataURI);
    }

    /**
     * @notice Update an existing agent
     * @param agentId ID of the agent to update
     * @param newPrice New price per call (0 to keep unchanged)
     * @param active Whether agent is accepting jobs
     * @param metadataURI New metadata URI (empty to keep unchanged)
     */
    function updateAgent(
        uint256 agentId,
        uint256 newPrice,
        bool active,
        string calldata metadataURI
    ) external {
        Agent storage agent = _agents[agentId];
        if (agent.owner == address(0)) revert AgentNotFound();
        if (agent.owner != msg.sender) revert NotAgentOwner();

        if (newPrice > 0) {
            agent.pricePerCall = newPrice;
        }
        agent.active = active;

        if (bytes(metadataURI).length > 0) {
            agent.metadataURI = metadataURI;
        }

        emit AgentUpdated(agentId, agent.pricePerCall, active, agent.metadataURI);
    }

    /**
     * @notice Increment agent stats after job completion (called by Router)
     * @param agentId ID of the agent
     * @param earnings Amount earned
     */
    function incrementAgentStats(
        uint256 agentId,
        uint256 earnings
    ) external onlyRouter {
        Agent storage agent = _agents[agentId];
        agent.totalEarnings += earnings;
        agent.totalJobs++;
        
        // Update global stats
        totalPlatformEarnings += earnings;
        totalPlatformJobs++;
    }

    // ============ View Functions ============

    function getAgent(uint256 agentId) external view returns (Agent memory) {
        return _agents[agentId];
    }

    function getAgentOwner(uint256 agentId) external view returns (address) {
        return _agents[agentId].owner;
    }

    function getAgentPrice(uint256 agentId) external view returns (uint256) {
        return _agents[agentId].pricePerCall;
    }

    function isAgentActive(uint256 agentId) external view returns (bool) {
        return _agents[agentId].active && _agents[agentId].owner != address(0);
    }

    function getAgentsByOwner(address owner) external view returns (uint256[] memory) {
        return _ownerAgents[owner];
    }

    /**
     * @notice Get agents with pagination
     * @param offset Starting index
     * @param limit Maximum number of agents to return
     * @return agents Array of Agent structs
     * @return total Total number of agents
     */
    function getAgents(
        uint256 offset,
        uint256 limit
    ) external view returns (Agent[] memory agents, uint256 total) {
        total = agentCount;
        
        if (offset >= total) {
            return (new Agent[](0), total);
        }
        
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        
        uint256 length = end - offset;
        agents = new Agent[](length);
        
        for (uint256 i = 0; i < length; i++) {
            agents[i] = _agents[offset + i];
        }
    }

    /**
     * @notice Get all active agents (for discovery)
     * @param offset Starting index
     * @param limit Maximum number of agents to return
     * @return agentIds Array of active agent IDs
     * @return agents Array of active Agent structs
     */
    function getActiveAgents(
        uint256 offset,
        uint256 limit
    ) external view returns (uint256[] memory agentIds, Agent[] memory agents) {
        // First pass: count active agents
        uint256 activeCount = 0;
        for (uint256 i = 0; i < agentCount; i++) {
            if (_agents[i].active && _agents[i].owner != address(0)) {
                activeCount++;
            }
        }
        
        if (offset >= activeCount) {
            return (new uint256[](0), new Agent[](0));
        }
        
        uint256 end = offset + limit;
        if (end > activeCount) {
            end = activeCount;
        }
        
        uint256 length = end - offset;
        agentIds = new uint256[](length);
        agents = new Agent[](length);
        
        // Second pass: collect active agents
        uint256 found = 0;
        uint256 collected = 0;
        for (uint256 i = 0; i < agentCount && collected < length; i++) {
            if (_agents[i].active && _agents[i].owner != address(0)) {
                if (found >= offset) {
                    agentIds[collected] = i;
                    agents[collected] = _agents[i];
                    collected++;
                }
                found++;
            }
        }
    }

    /**
     * @notice Get platform-wide statistics
     * @return _agentCount Total registered agents
     * @return _totalEarnings Total MNEE earned across all agents
     * @return _totalJobs Total jobs completed
     */
    function getPlatformStats() external view returns (
        uint256 _agentCount,
        uint256 _totalEarnings,
        uint256 _totalJobs
    ) {
        return (agentCount, totalPlatformEarnings, totalPlatformJobs);
    }
}
