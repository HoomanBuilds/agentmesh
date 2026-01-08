const { ethers } = require("hardhat")

async function main() {
    const registry = await ethers.getContractAt(
        "AgentRegistry",
        "0xB55a7AC0dD6464599E2D6332CfBe5E721ff14b30",
    )
    const router = await ethers.getContractAt(
        "AgentRouter",
        "0xDd7bA7620A520943d9aBDb60ef98Fa23D590080D",
    )
    const escrow = await ethers.getContractAt(
        "AgentEscrow",
        "0xc3e5969E12D9B75E1E54A6f31ccA83FD8d56539C",
    )
    const mnee = await ethers.getContractAt(
        "MockMNEE",
        "0xC18aCB0C4bBDB8c176C4328BD5fB3d9978A9A279",
    )

    console.log("\n=== Contract Debug ===\n")

    // Check agent count
    const count = await registry.agentCount()
    console.log("Total agents in registry:", count.toString())

    // Check agent 0 exists
    if (count > 0n) {
        const agent = await registry.getAgent(0)
        console.log("\nAgent 0:")
        console.log("  Owner:", agent.owner)
        console.log("  Price:", ethers.formatEther(agent.pricePerCall), "MNEE")
        console.log("  Active:", agent.active)
        console.log("  MetadataURI:", agent.metadataURI)
    } else {
        console.log("\n⚠️  No agents registered!")
    }

    // Check router address in registry
    const registryRouter = await registry.router()
    console.log("\nRouter address in Registry:", registryRouter)
    console.log("Expected Router:", "0xDd7bA7620A520943d9aBDb60ef98Fa23D590080D")
    console.log(
        "Match:",
        registryRouter.toLowerCase() === "0xDd7bA7620A520943d9aBDb60ef98Fa23D590080D".toLowerCase()
            ? "✅"
            : "❌",
    )

    // Check router address in escrow
    const escrowRouter = await escrow.router()
    console.log("\nRouter address in Escrow:", escrowRouter)
    console.log(
        "Match:",
        escrowRouter.toLowerCase() === "0xDd7bA7620A520943d9aBDb60ef98Fa23D590080D".toLowerCase()
            ? "✅"
            : "❌",
    )

    // Check user's MNEE balance and allowance
    const userAddress = "0x17A076d6cCaf37Bc9386EAB653A5EfAd8B07430C"
    const balance = await mnee.balanceOf(userAddress)
    const allowance = await mnee.allowance(userAddress, escrow.target)

    console.log("\nUser:", userAddress)
    console.log("  MNEE Balance:", ethers.formatEther(balance))
    console.log("  Allowance to Escrow:", ethers.formatEther(allowance))

    console.log("\n=== Done ===\n")
}

main().catch(console.error)
