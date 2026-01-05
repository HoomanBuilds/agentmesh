const fs = require("fs")
const path = require("path")
const { network } = require("hardhat")

/**
 * Post-deploy script to update frontend constants
 * - Exports contract ABIs to frontend/src/constants/
 * - Updates contractAddresses.json with deployed addresses by chainId
 */
module.exports = async ({ deployments }) => {
    const { get, log } = deployments
    const chainId = network.config.chainId.toString()

    log("----------------------------------------------------")
    log("Updating frontend constants...")

    // Define paths
    const frontendConstantsPath = path.join(__dirname, "../../frontend/src/constants")

    // Create directory if it doesn't exist
    if (!fs.existsSync(frontendConstantsPath)) {
        fs.mkdirSync(frontendConstantsPath, { recursive: true })
        log(`Created directory: ${frontendConstantsPath}`)
    }

    // Contract names to export
    const contracts = ["MockMNEE", "AgentRegistry", "AgentEscrow", "AgentRouter"]

    // Get deployed contract addresses
    const addresses = {}

    for (const contractName of contracts) {
        try {
            const deployment = await get(contractName)

            // Save ABI as JSON
            const abiPath = path.join(frontendConstantsPath, `${contractName}.json`)
            const abiData = {
                address: deployment.address,
                abi: deployment.abi,
            }
            fs.writeFileSync(abiPath, JSON.stringify(abiData, null, 2))
            log(`  ✓ Exported ${contractName}.json`)

            // Store address for addresses file
            addresses[contractName] = deployment.address
        } catch (error) {
            // Contract might not exist on this network (e.g., MockMNEE on mainnet)
            log(`  ⚠ Skipped ${contractName} (not deployed on this network)`)
        }
    }

    // Load existing addresses file or create new one
    const addressesFilePath = path.join(frontendConstantsPath, "contractAddresses.json")
    let allAddresses = {}

    if (fs.existsSync(addressesFilePath)) {
        const existingData = fs.readFileSync(addressesFilePath, "utf8")
        allAddresses = JSON.parse(existingData)
    }

    // Update addresses for current chainId
    allAddresses[chainId] = addresses

    // Write updated addresses file
    fs.writeFileSync(addressesFilePath, JSON.stringify(allAddresses, null, 2))
    log(`  ✓ Updated contractAddresses.json for chainId ${chainId}`)

    log("----------------------------------------------------")
    log("Frontend constants updated successfully!")
    log(`  Path: ${frontendConstantsPath}`)
    log(`  Chain ID: ${chainId}`)
    log(`  Contracts: ${Object.keys(addresses).join(", ")}`)
    log("----------------------------------------------------")
}

module.exports.tags = ["all", "frontend"]
module.exports.dependencies = ["router"]
module.exports.runAtTheEnd = true
