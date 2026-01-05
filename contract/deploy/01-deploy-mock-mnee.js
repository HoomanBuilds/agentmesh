const { network } = require("hardhat")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    if (chainId === 1) {
        log("----------------------------------------------------")
        log("Skipping MockMNEE on mainnet - using real MNEE token")
        log("  Real MNEE: 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF")
        log("----------------------------------------------------")
        return
    }

    log("----------------------------------------------------")
    log("Deploying MockMNEE (testnet only)...")

    const mockMNEE = await deploy("MockMNEE", {
        from: deployer,
        args: [],
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    log(`MockMNEE deployed at ${mockMNEE.address}`)
    log("----------------------------------------------------")
}

module.exports.tags = ["all", "mocks", "mnee"]
