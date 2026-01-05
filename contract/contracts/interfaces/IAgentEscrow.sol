// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IAgentEscrow
 * @notice Interface for the Agent Escrow contract
 */
interface IAgentEscrow {
    enum JobStatus {
        Pending,
        Completed,
        Disputed,
        Expired
    }

    struct Job {
        uint256 callerAgentId;
        uint256 providerAgentId;
        address callerWallet;
        uint256 amount;
        uint256 createdAt;
        JobStatus status;
    }

    event JobCreated(
        bytes32 indexed jobId,
        uint256 indexed callerAgentId,
        uint256 indexed providerAgentId,
        address callerWallet,
        uint256 amount
    );

    event JobCompleted(bytes32 indexed jobId, uint256 amount);
    event JobDisputed(bytes32 indexed jobId, uint256 amount);
    event JobExpired(bytes32 indexed jobId, uint256 amount);

    function createJob(
        uint256 callerAgentId,
        uint256 providerAgentId,
        address callerWallet,
        uint256 amount
    ) external returns (bytes32 jobId);

    function completeJob(bytes32 jobId, address providerOwner) external;
    function disputeJob(bytes32 jobId) external;
    function expireJob(bytes32 jobId, address providerOwner) external;

    function getJob(bytes32 jobId) external view returns (Job memory);
    function isJobExpired(bytes32 jobId) external view returns (bool);
    function jobTimeout() external view returns (uint256);
    function getEscrowStats() external view returns (
        uint256 _totalCreated,
        uint256 _totalCompleted,
        uint256 _totalDisputed,
        uint256 _totalExpired,
        uint256 _pending,
        uint256 _escrowBalance
    );
}
