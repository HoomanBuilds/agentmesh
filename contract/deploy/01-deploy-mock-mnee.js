const { network } = require("hardhat")
const { networkConfig } = require("../helper-hardhat-config")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    log("----------------------------------------------------")
    log("Deploying MockMNEE...")

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
