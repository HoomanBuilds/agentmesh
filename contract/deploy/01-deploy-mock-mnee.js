const { network } = require("hardhat")

// Real MNEE token address on Ethereum Mainnet
const MAINNET_MNEE_ADDRESS = "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF"

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    const isFork = process.env.FORK === "true"

    // Skip MockMNEE on mainnet or mainnet fork
    if (chainId === 1 || isFork) {
        log("----------------------------------------------------")
        log(
            isFork
                ? "Mainnet Fork detected - using real MNEE token"
                : "Mainnet - using real MNEE token",
        )
        log(`  Real MNEE: ${MAINNET_MNEE_ADDRESS}`)
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
