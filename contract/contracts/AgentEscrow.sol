// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IAgentEscrow.sol";

/**
 * @title AgentEscrow
 * @notice Handles MNEE payment escrow for agent services
 * @dev Locks funds, releases on confirmation, refunds on dispute
 */
contract AgentEscrow is IAgentEscrow, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ State Variables ============

    IERC20 public immutable mneeToken;
    uint256 public jobTimeout;
    address public router;
    
    // Platform fee settings
    address public platformTreasury;
    uint256 public platformFeeBps; // Fee in basis points (1000 = 10%)
    uint256 public totalPlatformFees; 
    
    // Job statistics
    uint256 public totalJobsCreated;
    uint256 public totalJobsCompleted;
    uint256 public totalJobsDisputed;
    uint256 public totalJobsExpired;
    uint256 public pendingJobsCount;

    // ============ Mappings ============

    mapping(bytes32 => Job) private _jobs;

    // ============ Errors ============

    error JobNotFound();
    error JobNotPending();
    error JobNotExpired();
    error OnlyRouter();
    error InvalidTreasury();
    error FeeTooHigh();

    // ============ Modifiers ============

    modifier onlyRouter() {
        if (msg.sender != router) revert OnlyRouter();
        _;
    }

    // ============ Constructor ============

    /**
     * @notice Initialize escrow with MNEE token and timeout
     * @param _mneeToken Address of the MNEE ERC20 token
     * @param _jobTimeout Timeout duration in seconds
     */
    constructor(
        address _mneeToken,
        uint256 _jobTimeout,
        address _platformTreasury,
        uint256 _platformFeeBps
    ) Ownable(msg.sender) {
        mneeToken = IERC20(_mneeToken);
        jobTimeout = _jobTimeout;
        platformTreasury = _platformTreasury;
        platformFeeBps = _platformFeeBps;
    }

    // ============ Admin Functions ============

    /**
     * @notice Set the router address
     * @param _router Address of the AgentRouter contract
     */
    function setRouter(address _router) external onlyOwner {
        router = _router;
    }

    /**
     * @notice Update job timeout
     * @param _newTimeout New timeout in seconds
     */
    function setJobTimeout(uint256 _newTimeout) external onlyOwner {
        jobTimeout = _newTimeout;
    }

    /**
     * @notice Update platform treasury address (only owner)
     * @param _treasury New treasury address
     */
    function setPlatformTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert InvalidTreasury();
        platformTreasury = _treasury;
    }

    /**
     * @notice Update platform fee in basis points (only owner)
     * @param _feeBps New fee in basis points (max 2000 = 20%)
     */
    function setPlatformFeeBps(uint256 _feeBps) external onlyOwner {
        if (_feeBps > 2000) revert FeeTooHigh();
        platformFeeBps = _feeBps;
    }

    // ============ Job Management (Called by Router) ============

    /**
     * @notice Create a new job and lock MNEE
     * @param callerAgentId ID of the calling agent
     * @param providerAgentId ID of the provider agent
     * @param callerWallet Address that is paying
     * @param amount Amount of MNEE to lock
     * @return jobId Unique job identifier
     */
    function createJob(
        uint256 callerAgentId,
        uint256 providerAgentId,
        address callerWallet,
        uint256 amount
    ) external onlyRouter nonReentrant returns (bytes32 jobId) {
        // Generate unique job ID
        jobId = keccak256(
            abi.encodePacked(
                block.timestamp,
                callerWallet,
                providerAgentId,
                callerAgentId,
                block.prevrandao
            )
        );

        // Transfer MNEE to escrow
        mneeToken.safeTransferFrom(callerWallet, address(this), amount);

        // Create job
        _jobs[jobId] = Job({
            callerAgentId: callerAgentId,
            providerAgentId: providerAgentId,
            callerWallet: callerWallet,
            amount: amount,
            createdAt: block.timestamp,
            status: JobStatus.Pending
        });

        emit JobCreated(jobId, callerAgentId, providerAgentId, callerWallet, amount);
        
        // Update stats
        totalJobsCreated++;
        pendingJobsCount++;
    }

    /**
     * @notice Complete a job and release funds to provider
     * @param jobId ID of the job
     * @param providerOwner Address to receive the funds
     */
    function completeJob(
        bytes32 jobId,
        address providerOwner
    ) external onlyRouter nonReentrant {
        Job storage job = _jobs[jobId];

        if (job.callerWallet == address(0)) revert JobNotFound();
        if (job.status != JobStatus.Pending) revert JobNotPending();

        job.status = JobStatus.Completed;

        // Calculate platform fee
        uint256 platformFee = (job.amount * platformFeeBps) / 10000;
        uint256 providerAmount = job.amount - platformFee;

        // Transfer platform fee to treasury
        if (platformFee > 0 && platformTreasury != address(0)) {
            mneeToken.safeTransfer(platformTreasury, platformFee);
            totalPlatformFees += platformFee;
            emit PlatformFeeCollected(jobId, platformFee);
        } else {
            providerAmount = job.amount;
        }

        // Release remaining MNEE to provider
        mneeToken.safeTransfer(providerOwner, providerAmount);

        emit JobCompleted(jobId, providerAmount);
        
        // Update stats
        totalJobsCompleted++;
        pendingJobsCount--;
    }

    /**
     * @notice Dispute a job and refund caller
     * @param jobId ID of the job
     */
    function disputeJob(bytes32 jobId) external onlyRouter nonReentrant {
        Job storage job = _jobs[jobId];

        if (job.callerWallet == address(0)) revert JobNotFound();
        if (job.status != JobStatus.Pending) revert JobNotPending();

        job.status = JobStatus.Disputed;

        // Refund MNEE to caller
        mneeToken.safeTransfer(job.callerWallet, job.amount);

        emit JobDisputed(jobId, job.amount);
        
        // Update stats
        totalJobsDisputed++;
        pendingJobsCount--;
    }

    /**
     * @notice Expire a job and release to provider (after timeout)
     * @param jobId ID of the job
     * @param providerOwner Address to receive the funds
     */
    function expireJob(
        bytes32 jobId,
        address providerOwner
    ) external onlyRouter nonReentrant {
        Job storage job = _jobs[jobId];

        if (job.callerWallet == address(0)) revert JobNotFound();
        if (job.status != JobStatus.Pending) revert JobNotPending();
        if (block.timestamp < job.createdAt + jobTimeout) revert JobNotExpired();

        job.status = JobStatus.Expired;

        // Calculate platform fee
        uint256 platformFee = (job.amount * platformFeeBps) / 10000;
        uint256 providerAmount = job.amount - platformFee;

        // Transfer platform fee to treasury
        if (platformFee > 0 && platformTreasury != address(0)) {
            mneeToken.safeTransfer(platformTreasury, platformFee);
            totalPlatformFees += platformFee;
            emit PlatformFeeCollected(jobId, platformFee);
        } else {
            providerAmount = job.amount;
        }

        // Release remaining MNEE to provider
        mneeToken.safeTransfer(providerOwner, providerAmount);

        emit JobExpired(jobId, providerAmount);
        
        // Update stats
        totalJobsExpired++;
        pendingJobsCount--;
    }

    // ============ View Functions ============

    function getJob(bytes32 jobId) external view returns (Job memory) {
        return _jobs[jobId];
    }

    function isJobExpired(bytes32 jobId) external view returns (bool) {
        Job storage job = _jobs[jobId];
        return job.status == JobStatus.Pending && block.timestamp >= job.createdAt + jobTimeout;
    }

    /**
     * @notice Get current MNEE balance locked in escrow
     * @return balance Amount of MNEE held in escrow
     */
    function getEscrowBalance() external view returns (uint256) {
        return mneeToken.balanceOf(address(this));
    }

    /**
     * @notice Get escrow statistics
     * @return _totalCreated Total jobs ever created
     * @return _totalCompleted Total jobs completed
     * @return _totalDisputed Total jobs disputed
     * @return _totalExpired Total jobs expired
     * @return _pending Current pending jobs
     * @return _escrowBalance Current MNEE in escrow
     */
    function getEscrowStats() external view returns (
        uint256 _totalCreated,
        uint256 _totalCompleted,
        uint256 _totalDisputed,
        uint256 _totalExpired,
        uint256 _pending,
        uint256 _escrowBalance
    ) {
        return (
            totalJobsCreated,
            totalJobsCompleted,
            totalJobsDisputed,
            totalJobsExpired,
            pendingJobsCount,
            mneeToken.balanceOf(address(this))
        );
    }

    /**
     * @notice Get platform fee statistics
     * @return _treasury Platform treasury address
     * @return _feeBps Current fee in basis points
     * @return _totalCollected Total fees collected ever
     */
    function getPlatformStats() external view returns (
        address _treasury,
        uint256 _feeBps,
        uint256 _totalCollected
    ) {
        return (platformTreasury, platformFeeBps, totalPlatformFees);
    }
}
