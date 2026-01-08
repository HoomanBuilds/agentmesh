const { expect } = require("chai")
const { ethers, deployments } = require("hardhat")

describe("AgentRegistry", function () {
    let agentRegistry, mockMNEE
    let deployer, user1, user2, router, wallet1, wallet2
    const PRICE_PER_CALL = ethers.parseEther("0.05")

    beforeEach(async function () {
        const signers = await ethers.getSigners()
        deployer = signers[0]
        user1 = signers[1]
        user2 = signers[2]
        router = signers[3] // Simulating router
        wallet1 = signers[4] // Agent wallet for user1
        wallet2 = signers[5] // Agent wallet for user2

        await deployments.fixture(["mocks", "registry"])

        const AgentRegistry = await deployments.get("AgentRegistry")
        agentRegistry = await ethers.getContractAt("AgentRegistry", AgentRegistry.address)

        // Set router for testing incrementAgentStats
        await agentRegistry.setRouter(router.address)
    })

    describe("Deployment", function () {
        it("should have zero agents initially", async function () {
            expect(await agentRegistry.agentCount()).to.equal(0)
        })

        it("should have correct owner", async function () {
            expect(await agentRegistry.owner()).to.equal(deployer.address)
        })

        it("should have router set", async function () {
            expect(await agentRegistry.router()).to.equal(router.address)
        })
    })

    describe("Agent Registration", function () {
        it("should register a new agent with wallet", async function () {
            const metadataURI = "https://api.agentpay.io/agents/1/metadata"

            const tx = await agentRegistry
                .connect(user1)
                .registerAgent(PRICE_PER_CALL, metadataURI, wallet1.address)

            await expect(tx)
                .to.emit(agentRegistry, "AgentRegistered")
                .withArgs(0, user1.address, wallet1.address, PRICE_PER_CALL, metadataURI)
        })

        it("should store agent data correctly including wallet", async function () {
            const metadataURI = "https://api.agentpay.io/agents/1/metadata"

            await agentRegistry
                .connect(user1)
                .registerAgent(PRICE_PER_CALL, metadataURI, wallet1.address)

            const agent = await agentRegistry.getAgent(0)
            expect(agent.owner).to.equal(user1.address)
            expect(agent.wallet).to.equal(wallet1.address)
            expect(agent.pricePerCall).to.equal(PRICE_PER_CALL)
            expect(agent.metadataURI).to.equal(metadataURI)
            expect(agent.active).to.equal(true)
            expect(agent.totalEarnings).to.equal(0)
            expect(agent.totalJobs).to.equal(0)
        })

        it("should revert if price is zero", async function () {
            await expect(
                agentRegistry.connect(user1).registerAgent(0, "uri", wallet1.address),
            ).to.be.revertedWithCustomError(agentRegistry, "InvalidPrice")
        })

        it("should revert if wallet is zero address", async function () {
            await expect(
                agentRegistry
                    .connect(user1)
                    .registerAgent(PRICE_PER_CALL, "uri", ethers.ZeroAddress),
            ).to.be.revertedWithCustomError(agentRegistry, "InvalidWallet")
        })

        it("should increment agent count", async function () {
            await agentRegistry
                .connect(user1)
                .registerAgent(PRICE_PER_CALL, "uri1", wallet1.address)
            await agentRegistry
                .connect(user2)
                .registerAgent(PRICE_PER_CALL, "uri2", wallet2.address)

            expect(await agentRegistry.agentCount()).to.equal(2)
        })

        it("should track agents by owner", async function () {
            await agentRegistry
                .connect(user1)
                .registerAgent(PRICE_PER_CALL, "uri1", wallet1.address)
            await agentRegistry
                .connect(user1)
                .registerAgent(PRICE_PER_CALL, "uri2", wallet1.address)
            await agentRegistry
                .connect(user2)
                .registerAgent(PRICE_PER_CALL, "uri3", wallet2.address)

            const user1Agents = await agentRegistry.getAgentsByOwner(user1.address)
            const user2Agents = await agentRegistry.getAgentsByOwner(user2.address)

            expect(user1Agents.length).to.equal(2)
            expect(user2Agents.length).to.equal(1)
        })
    })

    describe("Agent Update", function () {
        beforeEach(async function () {
            await agentRegistry.connect(user1).registerAgent(PRICE_PER_CALL, "uri", wallet1.address)
        })

        it("should update agent price", async function () {
            const newPrice = ethers.parseEther("0.10")

            await agentRegistry.connect(user1).updateAgent(0, newPrice, true, "")

            const agent = await agentRegistry.getAgent(0)
            expect(agent.pricePerCall).to.equal(newPrice)
        })

        it("should keep old price if newPrice is 0", async function () {
            await agentRegistry.connect(user1).updateAgent(0, 0, true, "")

            const agent = await agentRegistry.getAgent(0)
            expect(agent.pricePerCall).to.equal(PRICE_PER_CALL)
        })

        it("should update metadata URI", async function () {
            const newURI = "https://new-uri.com"

            await agentRegistry.connect(user1).updateAgent(0, 0, true, newURI)

            const agent = await agentRegistry.getAgent(0)
            expect(agent.metadataURI).to.equal(newURI)
        })

        it("should deactivate agent", async function () {
            await agentRegistry.connect(user1).updateAgent(0, 0, false, "")

            expect(await agentRegistry.isAgentActive(0)).to.equal(false)
        })

        it("should emit AgentUpdated event", async function () {
            const newPrice = ethers.parseEther("0.10")

            await expect(agentRegistry.connect(user1).updateAgent(0, newPrice, true, "")).to.emit(
                agentRegistry,
                "AgentUpdated",
            )
        })

        it("should revert if not owner", async function () {
            await expect(
                agentRegistry.connect(user2).updateAgent(0, PRICE_PER_CALL, true, ""),
            ).to.be.revertedWithCustomError(agentRegistry, "NotAgentOwner")
        })

        it("should revert if agent not found", async function () {
            await expect(
                agentRegistry.connect(user1).updateAgent(999, PRICE_PER_CALL, true, ""),
            ).to.be.revertedWithCustomError(agentRegistry, "AgentNotFound")
        })
    })

    describe("Agent Stats", function () {
        beforeEach(async function () {
            await agentRegistry.connect(user1).registerAgent(PRICE_PER_CALL, "uri", wallet1.address)
        })

        it("should increment agent stats (only router)", async function () {
            const earnings = ethers.parseEther("1.0")

            await agentRegistry.connect(router).incrementAgentStats(0, earnings)

            const agent = await agentRegistry.getAgent(0)
            expect(agent.totalEarnings).to.equal(earnings)
            expect(agent.totalJobs).to.equal(1)
        })

        it("should update platform stats", async function () {
            const earnings = ethers.parseEther("1.0")

            await agentRegistry.connect(router).incrementAgentStats(0, earnings)

            const [agentCount, totalEarnings, totalJobs] = await agentRegistry.getPlatformStats()
            expect(totalEarnings).to.equal(earnings)
            expect(totalJobs).to.equal(1)
        })

        it("should revert if not router", async function () {
            await expect(
                agentRegistry.connect(user1).incrementAgentStats(0, PRICE_PER_CALL),
            ).to.be.revertedWithCustomError(agentRegistry, "OnlyRouter")
        })
    })

    describe("View Functions", function () {
        beforeEach(async function () {
            await agentRegistry
                .connect(user1)
                .registerAgent(PRICE_PER_CALL, "uri1", wallet1.address)
            await agentRegistry
                .connect(user2)
                .registerAgent(PRICE_PER_CALL, "uri2", wallet2.address)
            await agentRegistry
                .connect(user1)
                .registerAgent(PRICE_PER_CALL, "uri3", wallet1.address)
        })

        it("should get agent owner", async function () {
            expect(await agentRegistry.getAgentOwner(0)).to.equal(user1.address)
            expect(await agentRegistry.getAgentOwner(1)).to.equal(user2.address)
        })

        it("should get agent wallet", async function () {
            expect(await agentRegistry.getAgentWallet(0)).to.equal(wallet1.address)
            expect(await agentRegistry.getAgentWallet(1)).to.equal(wallet2.address)
        })

        it("should get agent price", async function () {
            expect(await agentRegistry.getAgentPrice(0)).to.equal(PRICE_PER_CALL)
        })

        it("should check if agent is active", async function () {
            expect(await agentRegistry.isAgentActive(0)).to.equal(true)

            await agentRegistry.connect(user1).updateAgent(0, 0, false, "")

            expect(await agentRegistry.isAgentActive(0)).to.equal(false)
        })

        it("should get agents with pagination", async function () {
            const [agents, total] = await agentRegistry.getAgents(0, 10)

            expect(total).to.equal(3)
            expect(agents.length).to.equal(3)
        })

        it("should handle pagination offset", async function () {
            const [agents, total] = await agentRegistry.getAgents(1, 10)

            expect(total).to.equal(3)
            expect(agents.length).to.equal(2)
        })

        it("should get active agents only", async function () {
            await agentRegistry.connect(user1).updateAgent(0, 0, false, "")

            const [agentIds, agents] = await agentRegistry.getActiveAgents(0, 10)

            expect(agents.length).to.equal(2) // 1 deactivated
        })

        it("should get platform stats", async function () {
            const [agentCount, totalEarnings, totalJobs] = await agentRegistry.getPlatformStats()

            expect(agentCount).to.equal(3)
            expect(totalEarnings).to.equal(0)
            expect(totalJobs).to.equal(0)
        })
    })

    describe("Admin Functions", function () {
        it("should allow owner to set router", async function () {
            const newRouter = user2.address

            await agentRegistry.setRouter(newRouter)

            expect(await agentRegistry.router()).to.equal(newRouter)
        })

        it("should revert if non-owner sets router", async function () {
            await expect(
                agentRegistry.connect(user1).setRouter(user2.address),
            ).to.be.revertedWithCustomError(agentRegistry, "OwnableUnauthorizedAccount")
        })
    })
})
