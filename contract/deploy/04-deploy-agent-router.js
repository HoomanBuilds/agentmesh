const { network, ethers } = require("hardhat")

// Real MNEE token address on Ethereum Mainnet
const MAINNET_MNEE_ADDRESS = "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF"

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log, get, execute } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    const isFork = process.env.FORK === "true"

    log("----------------------------------------------------")
    log("Deploying AgentRouter...")

    // Get deployed contract addresses
    const agentRegistry = await get("AgentRegistry")
    const agentEscrow = await get("AgentEscrow")

    let mneeAddress
    if (chainId === 1 || isFork) {
        // Mainnet or mainnet fork - use real MNEE
        mneeAddress = MAINNET_MNEE_ADDRESS
    } else if (chainId === 31337 || chainId === 11155111) {
        const mockMNEE = await get("MockMNEE")
        mneeAddress = mockMNEE.address
    }

    const agentRouter = await deploy("AgentRouter", {
        from: deployer,
        args: [agentRegistry.address, agentEscrow.address, mneeAddress],
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    log(`AgentRouter deployed at ${agentRouter.address}`)
    log(`  - Registry: ${agentRegistry.address}`)
    log(`  - Escrow: ${agentEscrow.address}`)
    log(`  - MNEE: ${mneeAddress}`)

    // Set router address in Registry and Escrow
    log("----------------------------------------------------")
    log("Setting router address in Registry and Escrow...")

    await execute("AgentRegistry", { from: deployer, log: true }, "setRouter", agentRouter.address)

    await execute("AgentEscrow", { from: deployer, log: true }, "setRouter", agentRouter.address)

    log("Router setup complete!")
    log("----------------------------------------------------")
}

module.exports.tags = ["all", "router"]
module.exports.dependencies = ["registry", "escrow"]
