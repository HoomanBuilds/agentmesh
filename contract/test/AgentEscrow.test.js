const { expect } = require("chai")
const { ethers, deployments } = require("hardhat")

describe("AgentEscrow", function () {
    let agentEscrow, mockMNEE
    let deployer, user1, user2, router
    const JOB_TIMEOUT = 3600 // 1 hour
    const AMOUNT = ethers.parseEther("0.05")

    beforeEach(async function () {
        const signers = await ethers.getSigners()
        deployer = signers[0]
        user1 = signers[1]
        user2 = signers[2]
        router = signers[3] // Simulating router

        await deployments.fixture(["mocks", "escrow"])

        const MockMNEE = await deployments.get("MockMNEE")
        const AgentEscrow = await deployments.get("AgentEscrow")

        mockMNEE = await ethers.getContractAt("MockMNEE", MockMNEE.address)
        agentEscrow = await ethers.getContractAt("AgentEscrow", AgentEscrow.address)

        // Set router for testing
        await agentEscrow.setRouter(router.address)

        // Mint tokens to user1
        await mockMNEE.mint(user1.address, ethers.parseEther("1000"))

        // Approve escrow to spend user1's tokens
        await mockMNEE.connect(user1).approve(agentEscrow.target, ethers.parseEther("1000"))
    })

    describe("Deployment", function () {
        it("should have correct MNEE token", async function () {
            expect(await agentEscrow.mneeToken()).to.equal(mockMNEE.target)
        })

        it("should have correct job timeout", async function () {
            expect(await agentEscrow.jobTimeout()).to.equal(JOB_TIMEOUT)
        })

        it("should have router set", async function () {
            expect(await agentEscrow.router()).to.equal(router.address)
        })

        it("should have zero initial stats", async function () {
            expect(await agentEscrow.totalJobsCreated()).to.equal(0)
            expect(await agentEscrow.pendingJobsCount()).to.equal(0)
        })
    })

    describe("Job Creation", function () {
        it("should create a job and lock MNEE", async function () {
            const tx = await agentEscrow.connect(router).createJob(0, 1, user1.address, AMOUNT)
            const receipt = await tx.wait()

            // Check event
            const event = receipt.logs.find(
                (log) => log.fragment && log.fragment.name === "JobCreated",
            )
            expect(event).to.not.be.undefined

            // Check MNEE was locked
            expect(await mockMNEE.balanceOf(agentEscrow.target)).to.equal(AMOUNT)
        })

        it("should update job stats on creation", async function () {
            await agentEscrow.connect(router).createJob(0, 1, user1.address, AMOUNT)

            expect(await agentEscrow.totalJobsCreated()).to.equal(1)
            expect(await agentEscrow.pendingJobsCount()).to.equal(1)
        })

        it("should store job data correctly", async function () {
            const tx = await agentEscrow.connect(router).createJob(0, 1, user1.address, AMOUNT)
            const receipt = await tx.wait()

            const event = receipt.logs.find(
                (log) => log.fragment && log.fragment.name === "JobCreated",
            )
            const jobId = event.args[0]

            const job = await agentEscrow.getJob(jobId)
            expect(job.callerAgentId).to.equal(0)
            expect(job.providerAgentId).to.equal(1)
            expect(job.callerWallet).to.equal(user1.address)
            expect(job.amount).to.equal(AMOUNT)
            expect(job.status).to.equal(0) // Pending
        })

        it("should revert if not router", async function () {
            await expect(
                agentEscrow.connect(user1).createJob(0, 1, user1.address, AMOUNT),
            ).to.be.revertedWithCustomError(agentEscrow, "OnlyRouter")
        })
    })

    describe("Job Completion", function () {
        let jobId

        beforeEach(async function () {
            const tx = await agentEscrow.connect(router).createJob(0, 1, user1.address, AMOUNT)
            const receipt = await tx.wait()
            const event = receipt.logs.find(
                (log) => log.fragment && log.fragment.name === "JobCreated",
            )
            jobId = event.args[0]
        })

        it("should complete job and release MNEE to provider", async function () {
            const providerBalanceBefore = await mockMNEE.balanceOf(user2.address)

            await agentEscrow.connect(router).completeJob(jobId, user2.address)

            const providerBalanceAfter = await mockMNEE.balanceOf(user2.address)
            expect(providerBalanceAfter - providerBalanceBefore).to.equal(AMOUNT)
        })

        it("should update job status to Completed", async function () {
            await agentEscrow.connect(router).completeJob(jobId, user2.address)

            const job = await agentEscrow.getJob(jobId)
            expect(job.status).to.equal(1) // Completed
        })

        it("should update stats on completion", async function () {
            await agentEscrow.connect(router).completeJob(jobId, user2.address)

            expect(await agentEscrow.totalJobsCompleted()).to.equal(1)
            expect(await agentEscrow.pendingJobsCount()).to.equal(0)
        })

        it("should emit JobCompleted event", async function () {
            await expect(agentEscrow.connect(router).completeJob(jobId, user2.address))
                .to.emit(agentEscrow, "JobCompleted")
                .withArgs(jobId, AMOUNT)
        })

        it("should revert if job not pending", async function () {
            await agentEscrow.connect(router).completeJob(jobId, user2.address)

            await expect(
                agentEscrow.connect(router).completeJob(jobId, user2.address),
            ).to.be.revertedWithCustomError(agentEscrow, "JobNotPending")
        })

        it("should revert if not router", async function () {
            await expect(
                agentEscrow.connect(user1).completeJob(jobId, user2.address),
            ).to.be.revertedWithCustomError(agentEscrow, "OnlyRouter")
        })
    })

    describe("Job Dispute", function () {
        let jobId

        beforeEach(async function () {
            const tx = await agentEscrow.connect(router).createJob(0, 1, user1.address, AMOUNT)
            const receipt = await tx.wait()
            const event = receipt.logs.find(
                (log) => log.fragment && log.fragment.name === "JobCreated",
            )
            jobId = event.args[0]
        })

        it("should dispute job and refund MNEE to caller", async function () {
            const callerBalanceBefore = await mockMNEE.balanceOf(user1.address)

            await agentEscrow.connect(router).disputeJob(jobId)

            const callerBalanceAfter = await mockMNEE.balanceOf(user1.address)
            expect(callerBalanceAfter - callerBalanceBefore).to.equal(AMOUNT)
        })

        it("should update job status to Disputed", async function () {
            await agentEscrow.connect(router).disputeJob(jobId)

            const job = await agentEscrow.getJob(jobId)
            expect(job.status).to.equal(2) // Disputed
        })

        it("should update stats on dispute", async function () {
            await agentEscrow.connect(router).disputeJob(jobId)

            expect(await agentEscrow.totalJobsDisputed()).to.equal(1)
            expect(await agentEscrow.pendingJobsCount()).to.equal(0)
        })

        it("should emit JobDisputed event", async function () {
            await expect(agentEscrow.connect(router).disputeJob(jobId))
                .to.emit(agentEscrow, "JobDisputed")
                .withArgs(jobId, AMOUNT)
        })
    })

    describe("Job Expiration", function () {
        let jobId

        beforeEach(async function () {
            const tx = await agentEscrow.connect(router).createJob(0, 1, user1.address, AMOUNT)
            const receipt = await tx.wait()
            const event = receipt.logs.find(
                (log) => log.fragment && log.fragment.name === "JobCreated",
            )
            jobId = event.args[0]
        })

        it("should revert if job not expired yet", async function () {
            await expect(
                agentEscrow.connect(router).expireJob(jobId, user2.address),
            ).to.be.revertedWithCustomError(agentEscrow, "JobNotExpired")
        })

        it("should expire job after timeout", async function () {
            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [JOB_TIMEOUT + 1])
            await ethers.provider.send("evm_mine")

            const providerBalanceBefore = await mockMNEE.balanceOf(user2.address)

            await agentEscrow.connect(router).expireJob(jobId, user2.address)

            const providerBalanceAfter = await mockMNEE.balanceOf(user2.address)
            expect(providerBalanceAfter - providerBalanceBefore).to.equal(AMOUNT)
        })

        it("should update job status to Expired", async function () {
            await ethers.provider.send("evm_increaseTime", [JOB_TIMEOUT + 1])
            await ethers.provider.send("evm_mine")

            await agentEscrow.connect(router).expireJob(jobId, user2.address)

            const job = await agentEscrow.getJob(jobId)
            expect(job.status).to.equal(3) // Expired
        })

        it("should update stats on expiration", async function () {
            await ethers.provider.send("evm_increaseTime", [JOB_TIMEOUT + 1])
            await ethers.provider.send("evm_mine")

            await agentEscrow.connect(router).expireJob(jobId, user2.address)

            expect(await agentEscrow.totalJobsExpired()).to.equal(1)
            expect(await agentEscrow.pendingJobsCount()).to.equal(0)
        })

        it("should emit JobExpired event", async function () {
            await ethers.provider.send("evm_increaseTime", [JOB_TIMEOUT + 1])
            await ethers.provider.send("evm_mine")

            await expect(agentEscrow.connect(router).expireJob(jobId, user2.address))
                .to.emit(agentEscrow, "JobExpired")
                .withArgs(jobId, AMOUNT)
        })
    })

    describe("View Functions", function () {
        let jobId

        beforeEach(async function () {
            const tx = await agentEscrow.connect(router).createJob(0, 1, user1.address, AMOUNT)
            const receipt = await tx.wait()
            const event = receipt.logs.find(
                (log) => log.fragment && log.fragment.name === "JobCreated",
            )
            jobId = event.args[0]
        })

        it("should check if job is expired", async function () {
            expect(await agentEscrow.isJobExpired(jobId)).to.equal(false)

            await ethers.provider.send("evm_increaseTime", [JOB_TIMEOUT + 1])
            await ethers.provider.send("evm_mine")

            expect(await agentEscrow.isJobExpired(jobId)).to.equal(true)
        })

        it("should get escrow balance", async function () {
            expect(await agentEscrow.getEscrowBalance()).to.equal(AMOUNT)
        })

        it("should get escrow stats", async function () {
            const [totalCreated, totalCompleted, totalDisputed, totalExpired, pending, balance] =
                await agentEscrow.getEscrowStats()

            expect(totalCreated).to.equal(1)
            expect(totalCompleted).to.equal(0)
            expect(totalDisputed).to.equal(0)
            expect(totalExpired).to.equal(0)
            expect(pending).to.equal(1)
            expect(balance).to.equal(AMOUNT)
        })
    })

    describe("Admin Functions", function () {
        it("should allow owner to set router", async function () {
            await agentEscrow.setRouter(user2.address)
            expect(await agentEscrow.router()).to.equal(user2.address)
        })

        it("should allow owner to set job timeout", async function () {
            const newTimeout = 7200 // 2 hours

            await agentEscrow.setJobTimeout(newTimeout)

            expect(await agentEscrow.jobTimeout()).to.equal(newTimeout)
        })

        it("should revert if non-owner sets router", async function () {
            await expect(
                agentEscrow.connect(user1).setRouter(user2.address),
            ).to.be.revertedWithCustomError(agentEscrow, "OwnableUnauthorizedAccount")
        })

        it("should revert if non-owner sets timeout", async function () {
            await expect(
                agentEscrow.connect(user1).setJobTimeout(7200),
            ).to.be.revertedWithCustomError(agentEscrow, "OwnableUnauthorizedAccount")
        })
    })
})
