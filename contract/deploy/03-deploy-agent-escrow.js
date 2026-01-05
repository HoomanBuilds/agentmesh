const { network } = require("hardhat")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log, get } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    log("----------------------------------------------------")
    log("Deploying AgentEscrow...")

    // Get MNEE address
    let mneeAddress

    if (chainId === 31337 || chainId === 11155111) {
        // Local or Sepolia - use MockMNEE
        const mockMNEE = await get("MockMNEE")
        mneeAddress = mockMNEE.address
    } else if (chainId === 1) {
        // Ethereum Mainnet - use real MNEE
        mneeAddress = "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF"
    }

    // Job timeout: 1 hour (3600 seconds)
    const jobTimeout = 3600

    const agentEscrow = await deploy("AgentEscrow", {
        from: deployer,
        args: [mneeAddress, jobTimeout],
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    log(`AgentEscrow deployed at ${agentEscrow.address}`)
    log(`  - MNEE Token: ${mneeAddress}`)
    log(`  - Job Timeout: ${jobTimeout} seconds`)
    log("----------------------------------------------------")
}

module.exports.tags = ["all", "escrow"]
module.exports.dependencies = ["mocks"]
