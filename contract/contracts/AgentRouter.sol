// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IAgentRegistry.sol";
import "./interfaces/IAgentEscrow.sol";

/**
 * @title AgentRouter
 * @notice Main entry point for the AgentPay protocol
 * @dev Coordinates between AgentRegistry and AgentEscrow
 */
contract AgentRouter is Ownable {
    // ============ State Variables ============

    IAgentRegistry public registry;
    IAgentEscrow public escrow;
    IERC20 public mneeToken;

    // ============ Errors ============

    error AgentNotFound();
    error AgentNotActive();
    error CannotCallOwnAgent();
    error InsufficientAllowance();
    error NotJobCaller();
    error JobNotFound();

    // ============ Events ============

    event ServiceRequested(
        bytes32 indexed jobId,
        uint256 indexed callerAgentId,
        uint256 indexed providerAgentId,
        address callerWallet,
        uint256 amount
    );

    // ============ Constructor ============

    /**
     * @notice Initialize the router with registry and escrow addresses
     * @param _registry Address of the AgentRegistry contract
     * @param _escrow Address of the AgentEscrow contract
     * @param _mneeToken Address of the MNEE token
     */
    constructor(
        address _registry,
        address _escrow,
        address _mneeToken
    ) Ownable(msg.sender) {
        registry = IAgentRegistry(_registry);
        escrow = IAgentEscrow(_escrow);
        mneeToken = IERC20(_mneeToken);
    }

    // ============ Service Flow ============

    /**
     * @notice Request a service from an agent (locks MNEE in escrow)
     * @param providerAgentId ID of the agent providing the service
     * @param callerAgentId ID of the calling agent (0 if human caller)
     * @return jobId Unique identifier for this job
     */
    function requestService(
        uint256 providerAgentId,
        uint256 callerAgentId
    ) external returns (bytes32 jobId) {
        // Validate provider agent
        address providerOwner = registry.getAgentOwner(providerAgentId);
        if (providerOwner == address(0)) revert AgentNotFound();
        if (!registry.isAgentActive(providerAgentId)) revert AgentNotActive();
        if (providerOwner == msg.sender) revert CannotCallOwnAgent();

        uint256 price = registry.getAgentPrice(providerAgentId);

        // Check allowance
        if (mneeToken.allowance(msg.sender, address(escrow)) < price) {
            revert InsufficientAllowance();
        }

        // Create job in escrow
        jobId = escrow.createJob(
            callerAgentId,
            providerAgentId,
            msg.sender,
            price
        );

        emit ServiceRequested(
            jobId,
            callerAgentId,
            providerAgentId,
            msg.sender,
            price
        );
    }

    /**
     * @notice Confirm job completion (releases MNEE to provider)
     * @param jobId ID of the job to confirm
     */
    function confirmJob(bytes32 jobId) external {
        IAgentEscrow.Job memory job = escrow.getJob(jobId);

        if (job.callerWallet == address(0)) revert JobNotFound();
        if (job.callerWallet != msg.sender) revert NotJobCaller();

        address providerOwner = registry.getAgentOwner(job.providerAgentId);

        // Complete job in escrow
        escrow.completeJob(jobId, providerOwner);

        registry.incrementAgentStats(job.providerAgentId, job.amount);
    }

    /**
     * @notice Dispute a job (refunds MNEE to caller)
     * @param jobId ID of the job to dispute
     */
    function disputeJob(bytes32 jobId) external {
        IAgentEscrow.Job memory job = escrow.getJob(jobId);

        if (job.callerWallet == address(0)) revert JobNotFound();
        if (job.callerWallet != msg.sender) revert NotJobCaller();

        escrow.disputeJob(jobId);
    }

    /**
     * @notice Expire a job after timeout (releases MNEE to provider)
     * @dev Anyone can call this after the timeout period
     * @param jobId ID of the job to expire
     */
    function expireJob(bytes32 jobId) external {
        IAgentEscrow.Job memory job = escrow.getJob(jobId);

        if (job.callerWallet == address(0)) revert JobNotFound();

        address providerOwner = registry.getAgentOwner(job.providerAgentId);

        // Expire job in escrow
        escrow.expireJob(jobId, providerOwner);

        registry.incrementAgentStats(job.providerAgentId, job.amount);
    }

    // ============ View Functions ============

    /**
     * @notice Get agent details
     * @param agentId ID of the agent
     * @return Agent struct
     */
    function getAgent(uint256 agentId) external view returns (IAgentRegistry.Agent memory) {
        return registry.getAgent(agentId);
    }

    /**
     * @notice Get job details
     * @param jobId ID of the job
     * @return Job struct
     */
    function getJob(bytes32 jobId) external view returns (IAgentEscrow.Job memory) {
        return escrow.getJob(jobId);
    }

    /**
     * @notice Get total agent count
     * @return Number of registered agents
     */
    function agentCount() external view returns (uint256) {
        return registry.agentCount();
    }

    /**
     * @notice Check if a job is expired
     * @param jobId ID of the job
     * @return True if job can be expired
     */
    function isJobExpired(bytes32 jobId) external view returns (bool) {
        return escrow.isJobExpired(jobId);
    }

    /**
     * @notice Get agents by owner
     * @param owner Address of the owner
     * @return Array of agent IDs
     */
    function getAgentsByOwner(address owner) external view returns (uint256[] memory) {
        return registry.getAgentsByOwner(owner);
    }

    /**
     * @notice Get platform statistics
     * @return agentCount_ Total registered agents
     * @return totalEarnings Total MNEE earned
     * @return totalJobs Total jobs completed
     */
    function getPlatformStats() external view returns (
        uint256 agentCount_,
        uint256 totalEarnings,
        uint256 totalJobs
    ) {
        return registry.getPlatformStats();
    }

    /**
     * @notice Get escrow statistics
     * @return totalCreated Total jobs ever created
     * @return totalCompleted Total jobs completed
     * @return totalDisputed Total jobs disputed
     * @return totalExpired Total jobs expired
     * @return pending Current pending jobs
     * @return escrowBalance Current MNEE in escrow
     */
    function getEscrowStats() external view returns (
        uint256 totalCreated,
        uint256 totalCompleted,
        uint256 totalDisputed,
        uint256 totalExpired,
        uint256 pending,
        uint256 escrowBalance
    ) {
        return escrow.getEscrowStats();
    }

    /**
     * @notice Get the job timeout duration
     * @return Timeout in seconds
     */
    function getJobTimeout() external view returns (uint256) {
        return escrow.jobTimeout();
    }

    /**
     * @notice Get MNEE token address
     * @return MNEE token contract address
     */
    function getMneeToken() external view returns (address) {
        return address(mneeToken);
    }

    /**
     * @notice Get registry address
     * @return Registry contract address
     */
    function getRegistry() external view returns (address) {
        return address(registry);
    }

    /**
     * @notice Get escrow address
     * @return Escrow contract address
     */
    function getEscrow() external view returns (address) {
        return address(escrow);
    }
}
