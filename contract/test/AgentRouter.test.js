const { expect } = require("chai")
const { ethers, deployments } = require("hardhat")

describe("AgentRouter", function () {
    let agentRegistry, agentEscrow, agentRouter, mockMNEE
    let deployer, user1, user2, user3, wallet1, wallet2
    const PRICE_PER_CALL = ethers.parseEther("0.05")
    const JOB_TIMEOUT = 3600

    beforeEach(async function () {
        const signers = await ethers.getSigners()
        deployer = signers[0]
        user1 = signers[1]
        user2 = signers[2]
        user3 = signers[3]
        wallet1 = signers[4] // Agent wallet for user1's agent
        wallet2 = signers[5] // Agent wallet for user2's agent

        // Deploy all contracts
        await deployments.fixture(["all"])

        const MockMNEE = await deployments.get("MockMNEE")
        const AgentRegistry = await deployments.get("AgentRegistry")
        const AgentEscrow = await deployments.get("AgentEscrow")
        const AgentRouter = await deployments.get("AgentRouter")

        mockMNEE = await ethers.getContractAt("MockMNEE", MockMNEE.address)
        agentRegistry = await ethers.getContractAt("AgentRegistry", AgentRegistry.address)
        agentEscrow = await ethers.getContractAt("AgentEscrow", AgentEscrow.address)
        agentRouter = await ethers.getContractAt("AgentRouter", AgentRouter.address)

        // Mint MNEE to users
        await mockMNEE.mint(user1.address, ethers.parseEther("1000"))
        await mockMNEE.mint(user2.address, ethers.parseEther("1000"))
        await mockMNEE.mint(user3.address, ethers.parseEther("1000"))
    })

    describe("Deployment", function () {
        it("should have correct registry address", async function () {
            expect(await agentRouter.registry()).to.equal(agentRegistry.target)
        })

        it("should have correct escrow address", async function () {
            expect(await agentRouter.escrow()).to.equal(agentEscrow.target)
        })

        it("should have correct MNEE token", async function () {
            expect(await agentRouter.mneeToken()).to.equal(mockMNEE.target)
        })

        it("should have router set in registry", async function () {
            expect(await agentRegistry.router()).to.equal(agentRouter.target)
        })

        it("should have router set in escrow", async function () {
            expect(await agentEscrow.router()).to.equal(agentRouter.target)
        })
    })

    describe("Service Request", function () {
        beforeEach(async function () {
            // Register an agent owned by user1 with wallet1 as payment recipient
            await agentRegistry.connect(user1).registerAgent(PRICE_PER_CALL, "uri", wallet1.address)
        })

        it("should create a job and lock MNEE", async function () {
            await mockMNEE.connect(user2).approve(agentEscrow.target, PRICE_PER_CALL)

            const tx = await agentRouter.connect(user2).requestService(0, 0)
            const receipt = await tx.wait()

            const event = receipt.logs.find(
                (log) => log.fragment && log.fragment.name === "ServiceRequested",
            )
            expect(event).to.not.be.undefined

            // Check MNEE was locked in escrow
            expect(await mockMNEE.balanceOf(agentEscrow.target)).to.equal(PRICE_PER_CALL)
        })

        it("should emit ServiceRequested event with correct params", async function () {
            await mockMNEE.connect(user2).approve(agentEscrow.target, PRICE_PER_CALL)

            const tx = await agentRouter.connect(user2).requestService(0, 0)
            const receipt = await tx.wait()

            const event = receipt.logs.find(
                (log) => log.fragment && log.fragment.name === "ServiceRequested",
            )
            expect(event.args.callerAgentId).to.equal(0)
            expect(event.args.providerAgentId).to.equal(0)
            expect(event.args.callerWallet).to.equal(user2.address)
            expect(event.args.amount).to.equal(PRICE_PER_CALL)
        })

        it("should revert if agent not found", async function () {
            await mockMNEE.connect(user2).approve(agentEscrow.target, PRICE_PER_CALL)

            await expect(
                agentRouter.connect(user2).requestService(999, 0),
            ).to.be.revertedWithCustomError(agentRouter, "AgentNotFound")
        })

        it("should revert if agent not active", async function () {
            await agentRegistry.connect(user1).updateAgent(0, 0, false, "")
            await mockMNEE.connect(user2).approve(agentEscrow.target, PRICE_PER_CALL)

            await expect(
                agentRouter.connect(user2).requestService(0, 0),
            ).to.be.revertedWithCustomError(agentRouter, "AgentNotActive")
        })

        it("should revert if calling own agent", async function () {
            await mockMNEE.connect(user1).approve(agentEscrow.target, PRICE_PER_CALL)

            await expect(
                agentRouter.connect(user1).requestService(0, 0),
            ).to.be.revertedWithCustomError(agentRouter, "CannotCallOwnAgent")
        })

        it("should revert if insufficient allowance", async function () {
            await expect(
                agentRouter.connect(user2).requestService(0, 0),
            ).to.be.revertedWithCustomError(agentRouter, "InsufficientAllowance")
        })
    })

    describe("Job Confirmation", function () {
        let jobId

        beforeEach(async function () {
            // Register agent with wallet1 as payment recipient
            await agentRegistry.connect(user1).registerAgent(PRICE_PER_CALL, "uri", wallet1.address)
            await mockMNEE.connect(user2).approve(agentEscrow.target, PRICE_PER_CALL)

            const tx = await agentRouter.connect(user2).requestService(0, 0)
            const receipt = await tx.wait()
            const event = receipt.logs.find(
                (log) => log.fragment && log.fragment.name === "ServiceRequested",
            )
            jobId = event.args[0]
        })

        it("should confirm job and release MNEE to agent WALLET (not owner)", async function () {
            // wallet1 is the agent's wallet, user1 is the owner
            const walletBalanceBefore = await mockMNEE.balanceOf(wallet1.address)
            const ownerBalanceBefore = await mockMNEE.balanceOf(user1.address)

            await agentRouter.connect(user2).confirmJob(jobId)

            const walletBalanceAfter = await mockMNEE.balanceOf(wallet1.address)
            const ownerBalanceAfter = await mockMNEE.balanceOf(user1.address)

            // Payment goes to wallet, NOT owner
            expect(walletBalanceAfter - walletBalanceBefore).to.equal(PRICE_PER_CALL)
            expect(ownerBalanceAfter).to.equal(ownerBalanceBefore) // Owner unchanged
        })

        it("should update agent stats on confirmation", async function () {
            await agentRouter.connect(user2).confirmJob(jobId)

            const agent = await agentRegistry.getAgent(0)
            expect(agent.totalEarnings).to.equal(PRICE_PER_CALL)
            expect(agent.totalJobs).to.equal(1)
        })

        it("should update platform stats on confirmation", async function () {
            await agentRouter.connect(user2).confirmJob(jobId)

            const [agentCount, totalEarnings, totalJobs] = await agentRouter.getPlatformStats()
            expect(totalEarnings).to.equal(PRICE_PER_CALL)
            expect(totalJobs).to.equal(1)
        })

        it("should revert if not job caller", async function () {
            await expect(
                agentRouter.connect(user3).confirmJob(jobId),
            ).to.be.revertedWithCustomError(agentRouter, "NotJobCaller")
        })

        it("should revert if job not found", async function () {
            const fakeJobId = ethers.keccak256(ethers.toUtf8Bytes("fake"))

            await expect(
                agentRouter.connect(user2).confirmJob(fakeJobId),
            ).to.be.revertedWithCustomError(agentRouter, "JobNotFound")
        })
    })

    describe("Job Dispute", function () {
        let jobId

        beforeEach(async function () {
            await agentRegistry.connect(user1).registerAgent(PRICE_PER_CALL, "uri", wallet1.address)
            await mockMNEE.connect(user2).approve(agentEscrow.target, PRICE_PER_CALL)

            const tx = await agentRouter.connect(user2).requestService(0, 0)
            const receipt = await tx.wait()
            const event = receipt.logs.find(
                (log) => log.fragment && log.fragment.name === "ServiceRequested",
            )
            jobId = event.args[0]
        })

        it("should dispute job and refund MNEE to caller", async function () {
            const user2BalanceBefore = await mockMNEE.balanceOf(user2.address)

            await agentRouter.connect(user2).disputeJob(jobId)

            const user2BalanceAfter = await mockMNEE.balanceOf(user2.address)
            expect(user2BalanceAfter - user2BalanceBefore).to.equal(PRICE_PER_CALL)
        })

        it("should revert if not job caller", async function () {
            await expect(
                agentRouter.connect(user3).disputeJob(jobId),
            ).to.be.revertedWithCustomError(agentRouter, "NotJobCaller")
        })
    })

    describe("Job Expiration", function () {
        let jobId

        beforeEach(async function () {
            await agentRegistry.connect(user1).registerAgent(PRICE_PER_CALL, "uri", wallet1.address)
            await mockMNEE.connect(user2).approve(agentEscrow.target, PRICE_PER_CALL)

            const tx = await agentRouter.connect(user2).requestService(0, 0)
            const receipt = await tx.wait()
            const event = receipt.logs.find(
                (log) => log.fragment && log.fragment.name === "ServiceRequested",
            )
            jobId = event.args[0]
        })

        it("should revert if job not expired yet", async function () {
            await expect(agentRouter.connect(user3).expireJob(jobId)).to.be.revertedWithCustomError(
                agentEscrow,
                "JobNotExpired",
            )
        })

        it("should expire job after timeout and release to agent WALLET", async function () {
            await ethers.provider.send("evm_increaseTime", [JOB_TIMEOUT + 1])
            await ethers.provider.send("evm_mine")

            const walletBalanceBefore = await mockMNEE.balanceOf(wallet1.address)

            await agentRouter.connect(user3).expireJob(jobId)

            const walletBalanceAfter = await mockMNEE.balanceOf(wallet1.address)
            expect(walletBalanceAfter - walletBalanceBefore).to.equal(PRICE_PER_CALL)
        })

        it("should allow anyone to expire after timeout", async function () {
            await ethers.provider.send("evm_increaseTime", [JOB_TIMEOUT + 1])
            await ethers.provider.send("evm_mine")

            // user3 who is not involved can expire
            await expect(agentRouter.connect(user3).expireJob(jobId)).to.not.be.reverted
        })

        it("should update agent stats on expiration", async function () {
            await ethers.provider.send("evm_increaseTime", [JOB_TIMEOUT + 1])
            await ethers.provider.send("evm_mine")

            await agentRouter.connect(user3).expireJob(jobId)

            const agent = await agentRegistry.getAgent(0)
            expect(agent.totalEarnings).to.equal(PRICE_PER_CALL)
            expect(agent.totalJobs).to.equal(1)
        })
    })

    describe("View Functions", function () {
        beforeEach(async function () {
            await agentRegistry.connect(user1).registerAgent(PRICE_PER_CALL, "uri", wallet1.address)
        })

        it("should get agent via router", async function () {
            const agent = await agentRouter.getAgent(0)
            expect(agent.owner).to.equal(user1.address)
            expect(agent.wallet).to.equal(wallet1.address)
        })

        it("should get agent count via router", async function () {
            expect(await agentRouter.agentCount()).to.equal(1)
        })

        it("should get agents by owner via router", async function () {
            await agentRegistry
                .connect(user1)
                .registerAgent(PRICE_PER_CALL, "uri2", wallet1.address)

            const agentIds = await agentRouter.getAgentsByOwner(user1.address)
            expect(agentIds.length).to.equal(2)
        })

        it("should get platform stats via router", async function () {
            const [agentCount, totalEarnings, totalJobs] = await agentRouter.getPlatformStats()
            expect(agentCount).to.equal(1)
        })

        it("should get escrow stats via router", async function () {
            await mockMNEE.connect(user2).approve(agentEscrow.target, PRICE_PER_CALL)
            await agentRouter.connect(user2).requestService(0, 0)

            const [totalCreated, , , , pending, balance] = await agentRouter.getEscrowStats()
            expect(totalCreated).to.equal(1)
            expect(pending).to.equal(1)
            expect(balance).to.equal(PRICE_PER_CALL)
        })

        it("should get job timeout via router", async function () {
            expect(await agentRouter.getJobTimeout()).to.equal(JOB_TIMEOUT)
        })

        it("should get contract addresses via router", async function () {
            expect(await agentRouter.getMneeToken()).to.equal(mockMNEE.target)
            expect(await agentRouter.getRegistry()).to.equal(agentRegistry.target)
            expect(await agentRouter.getEscrow()).to.equal(agentEscrow.target)
        })

        it("should check if job is expired via router", async function () {
            await mockMNEE.connect(user2).approve(agentEscrow.target, PRICE_PER_CALL)
            const tx = await agentRouter.connect(user2).requestService(0, 0)
            const receipt = await tx.wait()
            const event = receipt.logs.find(
                (log) => log.fragment && log.fragment.name === "ServiceRequested",
            )
            const jobId = event.args[0]

            expect(await agentRouter.isJobExpired(jobId)).to.equal(false)

            await ethers.provider.send("evm_increaseTime", [JOB_TIMEOUT + 1])
            await ethers.provider.send("evm_mine")

            expect(await agentRouter.isJobExpired(jobId)).to.equal(true)
        })
    })
})
