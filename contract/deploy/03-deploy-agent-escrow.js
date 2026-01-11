const { network } = require("hardhat")

// Real MNEE token address on Ethereum Mainnet
const MAINNET_MNEE_ADDRESS = "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF"

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log, get } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    const isFork = process.env.FORK === "true"

    log("----------------------------------------------------")
    log("Deploying AgentEscrow...")

    // Get MNEE address
    let mneeAddress

    if (chainId === 1 || isFork) {
        // Mainnet or mainnet fork - use real MNEE
        mneeAddress = MAINNET_MNEE_ADDRESS
    } else if (chainId === 31337 || chainId === 11155111) {
        // Local or Sepolia - use MockMNEE
        const mockMNEE = await get("MockMNEE")
        mneeAddress = mockMNEE.address
    }

    // Job timeout: 1 hour (3600 seconds)
    const jobTimeout = 3600

    // Platform fee: 10% (1000 basis points)
    const platformFeeBps = 1000

    // Platform treasury: deployer address (can be changed later)
    const platformTreasury = deployer

    const agentEscrow = await deploy("AgentEscrow", {
        from: deployer,
        args: [mneeAddress, jobTimeout, platformTreasury, platformFeeBps],
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    log(`AgentEscrow deployed at ${agentEscrow.address}`)
    log(`  - MNEE Token: ${mneeAddress}`)
    log(`  - Job Timeout: ${jobTimeout} seconds`)
    log(`  - Platform Treasury: ${platformTreasury}`)
    log(`  - Platform Fee: ${platformFeeBps / 100}%`)
    log("----------------------------------------------------")
}

module.exports.tags = ["all", "escrow"]
module.exports.dependencies = ["mocks"]
