const { ethers } = require("ethers")

async function main() {
    const provider = new ethers.JsonRpcProvider("https://rpc.sepolia.org")

    const registryAddress = "0x3B581B73b7dD01D7CeCBe7A6d87980c3AfC145e8"
    const registryAbi = [
        "function getAgentOwner(uint256 agentId) view returns (address)",
        "function getAgentWallet(uint256 agentId) view returns (address)",
        "function agentCount() view returns (uint256)",
    ]

    const registry = new ethers.Contract(registryAddress, registryAbi, provider)

    const count = await registry.agentCount()
    console.log("Total agents:", count.toString())

    for (let i = 1; i <= Number(count); i++) {
        try {
            const owner = await registry.getAgentOwner(i)
            const wallet = await registry.getAgentWallet(i)
            console.log(`Agent ${i}: owner=${owner}, wallet=${wallet}`)
        } catch (e) {
            console.log(`Agent ${i}: Not found`)
        }
    }
}

main().catch(console.error)
