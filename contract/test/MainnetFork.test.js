/**
 * Mainnet Fork Integration Tests
 * Tests AgentPay contracts against real MNEE token on forked mainnet
 *
 * Run these tests with:
 * 1. Start a fork node: npx hardhat node --fork $MAINNET_RPC_URL
 * 2. Run tests: npx hardhat test test/MainnetFork.test.js --network fork
 */

const { expect } = require("chai")
const { ethers, network } = require("hardhat")

// Real MNEE token on Ethereum mainnet (checksummed address)
const MNEE_ADDRESS = "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF"

// Known MNEE whale address (will be impersonated for testing)
const MNEE_WHALE = "0x4240781a9ebdb2eb14a183466e8820978b7da4e2"

describe("Mainnet Fork Integration Tests", function () {
    let mneeToken
    let agentRegistry
    let agentEscrow
    let agentRouter
    let deployer
    let user1
    let user2
    let treasury
    let mneeWhale

    // Test constants
    const PRICE_PER_CALL = ethers.parseUnits("10", 18) // 10 MNEE
    const JOB_TIMEOUT = 3600 // 1 hour
    const PLATFORM_FEE_BPS = 1000 // 10%
    const METADATA_URI = "ipfs://QmTest123"

    before(async function () {
        // Check if we're on a fork
        const blockNumber = await ethers.provider.getBlockNumber()
        console.log(`\n📊 Current block number: ${blockNumber}`)

        if (blockNumber < 1000) {
            console.log(
                "⚠️  Warning: Block number is low. Make sure you're running on a mainnet fork!",
            )
            console.log("   Run: npx hardhat node --fork $MAINNET_RPC_URL")
        }

        // Get signers
        ;[deployer, user1, user2, treasury] = await ethers.getSigners()
        console.log(`\n👤 Deployer: ${deployer.address}`)
        console.log(`👤 User1: ${user1.address}`)
        console.log(`👤 User2: ${user2.address}`)
        console.log(`💰 Treasury: ${treasury.address}`)

        // Connect to real MNEE token
        mneeToken = await ethers.getContractAt("IERC20", MNEE_ADDRESS)

        // Check MNEE token info
        const mneeBalance = await mneeToken.balanceOf(MNEE_ADDRESS)
        console.log(`\n🪙 MNEE Token Address: ${MNEE_ADDRESS}`)
        console.log(`   Contract Balance: ${ethers.formatUnits(mneeBalance, 18)} MNEE`)

        // Find a MNEE whale to impersonate
        // We'll use the token contract itself or find a holder
        try {
            await network.provider.request({
                method: "hardhat_impersonateAccount",
                params: [MNEE_WHALE],
            })
            mneeWhale = await ethers.getSigner(MNEE_WHALE)

            // Fund the whale with some ETH for gas
            await deployer.sendTransaction({
                to: MNEE_WHALE,
                value: ethers.parseEther("10"),
            })

            const whaleBalance = await mneeToken.balanceOf(MNEE_WHALE)
            console.log(`\n🐋 Impersonating whale: ${MNEE_WHALE}`)
            console.log(`   MNEE Balance: ${ethers.formatUnits(whaleBalance, 18)} MNEE`)
        } catch (error) {
            console.log("⚠️  Could not impersonate whale, tests may fail")
            console.log("   Error:", error.message)
        }
    })

    describe("Contract Deployment on Fork", function () {
        it("Should deploy AgentRegistry", async function () {
            const AgentRegistry = await ethers.getContractFactory("AgentRegistry")
            agentRegistry = await AgentRegistry.deploy()
            await agentRegistry.waitForDeployment()

            console.log(`\n✅ AgentRegistry deployed at: ${await agentRegistry.getAddress()}`)
            expect(await agentRegistry.getAddress()).to.not.equal(ethers.ZeroAddress)
        })

        it("Should deploy AgentEscrow with real MNEE token", async function () {
            const AgentEscrow = await ethers.getContractFactory("AgentEscrow")
            agentEscrow = await AgentEscrow.deploy(
                MNEE_ADDRESS,
                JOB_TIMEOUT,
                treasury.address,
                PLATFORM_FEE_BPS,
            )
            await agentEscrow.waitForDeployment()

            console.log(`✅ AgentEscrow deployed at: ${await agentEscrow.getAddress()}`)

            // Verify MNEE token is correctly set
            const mneeAddress = await agentEscrow.mneeToken()
            expect(mneeAddress).to.equal(MNEE_ADDRESS)
            console.log(`   Using MNEE token: ${mneeAddress}`)
        })

        it("Should deploy AgentRouter and link contracts", async function () {
            const AgentRouter = await ethers.getContractFactory("AgentRouter")
            agentRouter = await AgentRouter.deploy(
                await agentRegistry.getAddress(),
                await agentEscrow.getAddress(),
                MNEE_ADDRESS,
            )
            await agentRouter.waitForDeployment()

            // Set router on registry and escrow
            await agentRegistry.setRouter(await agentRouter.getAddress())
            await agentEscrow.setRouter(await agentRouter.getAddress())

            console.log(`✅ AgentRouter deployed at: ${await agentRouter.getAddress()}`)
            console.log(`   Registry set router: ${await agentRegistry.router()}`)
            console.log(`   Escrow set router: ${await agentEscrow.router()}`)
        })
    })

    describe("Agent Registration with Real Token", function () {
        it("Should register an agent", async function () {
            const tx = await agentRegistry
                .connect(user1)
                .registerAgent(PRICE_PER_CALL, METADATA_URI, user1.address)
            await tx.wait()

            const agent = await agentRegistry.getAgent(0)
            expect(agent.owner).to.equal(user1.address)
            expect(agent.pricePerCall).to.equal(PRICE_PER_CALL)
            expect(agent.active).to.be.true

            console.log(`\n✅ Agent 0 registered by ${user1.address}`)
            console.log(`   Price: ${ethers.formatUnits(agent.pricePerCall, 18)} MNEE`)
        })
    })

    describe("Full Service Flow with Real MNEE", function () {
        let jobId

        before(async function () {
            // Skip if no whale available
            if (!mneeWhale) {
                this.skip()
            }

            // Transfer MNEE from whale to user2 for testing
            const transferAmount = ethers.parseUnits("1000", 18)
            const whaleBalance = await mneeToken.balanceOf(MNEE_WHALE)

            if (whaleBalance >= transferAmount) {
                await mneeToken.connect(mneeWhale).transfer(user2.address, transferAmount)
                console.log(
                    `\n💸 Transferred ${ethers.formatUnits(transferAmount, 18)} MNEE to user2`,
                )
            } else {
                console.log("⚠️  Whale has insufficient MNEE balance")
                this.skip()
            }
        })

        it("Should approve escrow to spend MNEE", async function () {
            const user2Balance = await mneeToken.balanceOf(user2.address)
            console.log(`\n📊 User2 MNEE balance: ${ethers.formatUnits(user2Balance, 18)}`)

            if (user2Balance < PRICE_PER_CALL) {
                this.skip()
            }

            await mneeToken.connect(user2).approve(await agentEscrow.getAddress(), PRICE_PER_CALL)

            const allowance = await mneeToken.allowance(
                user2.address,
                await agentEscrow.getAddress(),
            )
            expect(allowance).to.equal(PRICE_PER_CALL)
            console.log(
                `✅ Approved escrow to spend ${ethers.formatUnits(PRICE_PER_CALL, 18)} MNEE`,
            )
        })

        it("Should request service and lock real MNEE in escrow", async function () {
            const user2BalanceBefore = await mneeToken.balanceOf(user2.address)

            const tx = await agentRouter.connect(user2).requestService(0, 0) // providerAgentId=0, callerAgentId=0
            const receipt = await tx.wait()

            // Extract jobId from event
            const event = receipt.logs.find((log) => {
                try {
                    return agentRouter.interface.parseLog(log)?.name === "ServiceRequested"
                } catch {
                    return false
                }
            })
            jobId = agentRouter.interface.parseLog(event).args.jobId

            const user2BalanceAfter = await mneeToken.balanceOf(user2.address)
            const escrowBalance = await mneeToken.balanceOf(await agentEscrow.getAddress())

            expect(user2BalanceAfter).to.equal(user2BalanceBefore - PRICE_PER_CALL)
            expect(escrowBalance).to.equal(PRICE_PER_CALL)

            console.log(`\n✅ Service requested, Job ID: ${jobId}`)
            console.log(
                `   User2 balance decreased by: ${ethers.formatUnits(PRICE_PER_CALL, 18)} MNEE`,
            )
            console.log(`   Escrow balance: ${ethers.formatUnits(escrowBalance, 18)} MNEE`)
        })

        it("Should complete job and release MNEE with platform fee", async function () {
            if (!jobId) this.skip()

            const user1BalanceBefore = await mneeToken.balanceOf(user1.address)
            const treasuryBalanceBefore = await mneeToken.balanceOf(treasury.address)

            await agentRouter.connect(user2).confirmJob(jobId)

            const user1BalanceAfter = await mneeToken.balanceOf(user1.address)
            const treasuryBalanceAfter = await mneeToken.balanceOf(treasury.address)
            const escrowBalance = await mneeToken.balanceOf(await agentEscrow.getAddress())

            // Calculate expected amounts
            const expectedFee = (PRICE_PER_CALL * BigInt(PLATFORM_FEE_BPS)) / BigInt(10000)
            const expectedPayment = PRICE_PER_CALL - expectedFee

            expect(escrowBalance).to.equal(0)
            expect(user1BalanceAfter).to.equal(user1BalanceBefore + expectedPayment)
            expect(treasuryBalanceAfter).to.equal(treasuryBalanceBefore + expectedFee)

            console.log(`\n✅ Job completed successfully!`)
            console.log(
                `   Provider (user1) received: ${ethers.formatUnits(expectedPayment, 18)} MNEE`,
            )
            console.log(`   Platform fee (treasury): ${ethers.formatUnits(expectedFee, 18)} MNEE`)
            console.log(`   Escrow balance: 0 MNEE`)
        })
    })

    describe("Gas Estimation on Mainnet Fork", function () {
        it("Should estimate gas for registerAgent", async function () {
            const AgentRegistry = await ethers.getContractFactory("AgentRegistry")
            const tx = await agentRegistry
                .connect(user2)
                .registerAgent.estimateGas(PRICE_PER_CALL, METADATA_URI, user2.address)
            console.log(`\n⛽ registerAgent gas estimate: ${tx.toString()}`)
        })

        it("Should estimate gas for requestService", async function () {
            // First register agent 1
            await agentRegistry
                .connect(user2)
                .registerAgent(PRICE_PER_CALL, METADATA_URI, user2.address)

            // Transfer and approve MNEE for user1
            if (mneeWhale) {
                const whaleBalance = await mneeToken.balanceOf(MNEE_WHALE)
                if (whaleBalance >= PRICE_PER_CALL) {
                    await mneeToken.connect(mneeWhale).transfer(user1.address, PRICE_PER_CALL)
                    await mneeToken
                        .connect(user1)
                        .approve(await agentEscrow.getAddress(), PRICE_PER_CALL)

                    const tx = await agentRouter.connect(user1).requestService.estimateGas(1, 0)
                    console.log(`⛽ requestService gas estimate: ${tx.toString()}`)
                }
            }
        })
    })

    describe("Emergency Withdraw", function () {
        it("Should allow owner to withdraw stuck MNEE tokens", async function () {
            // Send some MNEE directly to escrow (simulating stuck tokens)
            if (!mneeWhale) this.skip()

            const stuckAmount = ethers.parseUnits("5", 18)
            const whaleBalance = await mneeToken.balanceOf(MNEE_WHALE)

            if (whaleBalance < stuckAmount) this.skip()

            // Send tokens directly to escrow (these would be "stuck")
            await mneeToken.connect(mneeWhale).transfer(await agentEscrow.getAddress(), stuckAmount)

            const escrowBalanceBefore = await mneeToken.balanceOf(await agentEscrow.getAddress())
            const treasuryBalanceBefore = await mneeToken.balanceOf(treasury.address)

            console.log(
                `\n📊 Escrow balance before: ${ethers.formatUnits(escrowBalanceBefore, 18)} MNEE`,
            )

            // Owner calls emergencyWithdraw
            await agentEscrow.emergencyWithdraw(MNEE_ADDRESS, treasury.address, stuckAmount)

            const escrowBalanceAfter = await mneeToken.balanceOf(await agentEscrow.getAddress())
            const treasuryBalanceAfter = await mneeToken.balanceOf(treasury.address)

            expect(escrowBalanceAfter).to.equal(escrowBalanceBefore - stuckAmount)
            expect(treasuryBalanceAfter).to.equal(treasuryBalanceBefore + stuckAmount)

            console.log(`✅ Emergency withdraw successful!`)
            console.log(`   Recovered: ${ethers.formatUnits(stuckAmount, 18)} MNEE`)
            console.log(`   Sent to treasury: ${treasury.address}`)
        })

        it("Should reject emergency withdraw from non-owner", async function () {
            const stuckAmount = ethers.parseUnits("1", 18)

            await expect(
                agentEscrow
                    .connect(user1)
                    .emergencyWithdraw(MNEE_ADDRESS, user1.address, stuckAmount),
            ).to.be.revertedWithCustomError(agentEscrow, "OwnableUnauthorizedAccount")

            console.log(`\n✅ Non-owner correctly rejected from emergency withdraw`)
        })

        it("Should allow owner to manually complete stuck job with auto-split", async function () {
            if (!mneeWhale) this.skip()

            // Create a "stuck" job by registering another agent and requesting service
            const amount = ethers.parseUnits("20", 18)

            // Register another agent
            const agentWallet2 = ethers.Wallet.createRandom().address
            await agentRegistry.connect(user2).registerAgent(amount, "ipfs://agent2", agentWallet2)

            // Request service (creates pending job)
            await mneeToken.connect(mneeWhale).approve(await agentEscrow.getAddress(), amount)
            const tx = await agentRouter.connect(mneeWhale).requestService(1, 0)
            const receipt = await tx.wait()

            // Find the jobId from events
            const event = receipt.logs.find((log) => {
                try {
                    const parsed = agentRouter.interface.parseLog(log)
                    return parsed?.name === "ServiceRequested"
                } catch {
                    return false
                }
            })
            const jobId = agentRouter.interface.parseLog(event).args.jobId

            console.log(`\n📋 Created stuck job: ${jobId}`)

            // Get the actual job data from escrow to use correct amount
            const job = await agentEscrow.getJob(jobId)
            const actualJobAmount = job.amount
            console.log(`   Job amount: ${ethers.formatUnits(actualJobAmount, 18)} MNEE`)

            // Get balances before emergency complete
            const treasuryBalanceBefore = await mneeToken.balanceOf(treasury.address)
            const agentBalanceBefore = await mneeToken.balanceOf(agentWallet2)

            // Owner calls emergencyCompleteJob
            await agentEscrow.emergencyCompleteJob(jobId, agentWallet2)

            const treasuryBalanceAfter = await mneeToken.balanceOf(treasury.address)
            const agentBalanceAfter = await mneeToken.balanceOf(agentWallet2)

            // Verify 10% went to treasury, 90% went to agent - using ACTUAL job amount
            const platformFee = (actualJobAmount * 1000n) / 10000n // 10%
            const providerAmount = actualJobAmount - platformFee // 90%

            expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(platformFee)
            expect(agentBalanceAfter - agentBalanceBefore).to.equal(providerAmount)

            console.log(`✅ Emergency complete job successful!`)
            console.log(`   Platform fee (10%): ${ethers.formatUnits(platformFee, 18)} MNEE`)
            console.log(`   Provider amount (90%): ${ethers.formatUnits(providerAmount, 18)} MNEE`)
        })
    })

    after(async function () {
        // Stop impersonating
        if (mneeWhale) {
            await network.provider.request({
                method: "hardhat_stopImpersonatingAccount",
                params: [MNEE_WHALE],
            })
        }

        console.log("\n🏁 Mainnet fork tests completed!")
    })
})
