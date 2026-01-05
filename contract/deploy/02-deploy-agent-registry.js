const { network } = require("hardhat")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    log("----------------------------------------------------")
    log("Deploying AgentRegistry...")

    const agentRegistry = await deploy("AgentRegistry", {
        from: deployer,
        args: [],
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    log(`AgentRegistry deployed at ${agentRegistry.address}`)
    log("----------------------------------------------------")
}

module.exports.tags = ["all", "registry"]
module.exports.dependencies = ["mocks"]
