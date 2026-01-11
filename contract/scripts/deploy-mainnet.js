const { ethers, network } = require("hardhat")
const fs = require("fs")
const path = require("path")

// Real MNEE token address on Ethereum Mainnet
const MAINNET_MNEE_ADDRESS = "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF"

async function main() {
    console.log("\n🚀 Starting Mainnet Deployment...")
    console.log("================================\n")

    const [deployer] = await ethers.getSigners()
    const balance = await ethers.provider.getBalance(deployer.address)

    console.log("📍 Network:", network.name)
    console.log("👤 Deployer:", deployer.address)
    console.log("💰 Balance:", ethers.formatEther(balance), "ETH")
    console.log("🪙 MNEE Token:", MAINNET_MNEE_ADDRESS)
    console.log("\n")

    // Deploy AgentRegistry
    console.log("1️⃣  Deploying AgentRegistry...")
    const AgentRegistry = await ethers.getContractFactory("AgentRegistry")
    const agentRegistry = await AgentRegistry.deploy()
    await agentRegistry.waitForDeployment()
    const registryAddress = await agentRegistry.getAddress()
    console.log("   ✅ AgentRegistry deployed at:", registryAddress)

    // Deploy AgentEscrow
    console.log("\n2️⃣  Deploying AgentEscrow...")
    const jobTimeout = 3600 // 1 hour
    const platformFeeBps = 1000 // 10%
    const platformTreasury = deployer.address

    const AgentEscrow = await ethers.getContractFactory("AgentEscrow")
    const agentEscrow = await AgentEscrow.deploy(
        MAINNET_MNEE_ADDRESS,
        jobTimeout,
        platformTreasury,
        platformFeeBps,
    )
    await agentEscrow.waitForDeployment()
    const escrowAddress = await agentEscrow.getAddress()
    console.log("   ✅ AgentEscrow deployed at:", escrowAddress)
    console.log("      - MNEE Token:", MAINNET_MNEE_ADDRESS)
    console.log("      - Job Timeout:", jobTimeout, "seconds")
    console.log("      - Platform Fee:", platformFeeBps / 100, "%")
    console.log("      - Platform Treasury:", platformTreasury)

    // Deploy AgentRouter
    console.log("\n3️⃣  Deploying AgentRouter...")
    const AgentRouter = await ethers.getContractFactory("AgentRouter")
    const agentRouter = await AgentRouter.deploy(
        registryAddress,
        escrowAddress,
        MAINNET_MNEE_ADDRESS,
    )
    await agentRouter.waitForDeployment()
    const routerAddress = await agentRouter.getAddress()
    console.log("   ✅ AgentRouter deployed at:", routerAddress)

    // Set router on Registry and Escrow
    console.log("\n4️⃣  Setting router on Registry and Escrow...")
    const tx1 = await agentRegistry.setRouter(routerAddress)
    await tx1.wait()
    console.log("   ✅ Registry router set")

    const tx2 = await agentEscrow.setRouter(routerAddress)
    await tx2.wait()
    console.log("   ✅ Escrow router set")

    // Save deployment addresses
    const addresses = {
        network: network.name,
        chainId: network.config.chainId,
        deployer: deployer.address,
        contracts: {
            AgentRegistry: registryAddress,
            AgentEscrow: escrowAddress,
            AgentRouter: routerAddress,
            MNEE: MAINNET_MNEE_ADDRESS,
        },
        config: {
            jobTimeout,
            platformFeeBps,
            platformTreasury,
        },
        deployedAt: new Date().toISOString(),
    }

    // Save to deployments folder
    const deploymentsDir = path.join(__dirname, "..", "deployments", network.name)
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true })
    }

    fs.writeFileSync(
        path.join(deploymentsDir, "addresses.json"),
        JSON.stringify(addresses, null, 2),
    )

    console.log("\n================================")
    console.log("🎉 Deployment Complete!")
    console.log("================================\n")
    console.log("Contract Addresses:")
    console.log("  AgentRegistry:", registryAddress)
    console.log("  AgentEscrow:  ", escrowAddress)
    console.log("  AgentRouter:  ", routerAddress)
    console.log("\nAddresses saved to:", path.join(deploymentsDir, "addresses.json"))

    // Calculate gas spent
    const balanceAfter = await ethers.provider.getBalance(deployer.address)
    const gasSpent = balance - balanceAfter
    console.log("\n💸 Total gas spent:", ethers.formatEther(gasSpent), "ETH")
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Deployment failed:", error)
        process.exit(1)
    })
