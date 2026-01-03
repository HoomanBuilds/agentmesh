require("@nomicfoundation/hardhat-ethers")
require("@nomicfoundation/hardhat-chai-matchers")
require("hardhat-deploy")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
require("solidity-coverage")
require("@nomicfoundation/hardhat-verify")
require("dotenv").config()

const { networkConfig } = require("./helper-hardhat-config")

const PRIVATE_KEY = process.env.PRIVATE_KEY
const SEPOLIA_RPC_URL =
    process.env.SEPOLIA_RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/your-api-key"

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || ""

module.exports = {
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            chainId: 31337,
            allowUnlimitedContractSize: true,
        },
        localhost: {
            chainId: 31337,
            allowUnlimitedContractSize: true,
        },
        sepolia: {
            url: SEPOLIA_RPC_URL,
            accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
            chainId: 11155111,
            blockConfirmations: 6,
        },
    },
    etherscan: {
        apiKey: ETHERSCAN_API_KEY,
    },
    gasReporter: {
        enabled: true,
        currency: "USD",
    },
    namedAccounts: {
        deployer: {
            default: 0,
            [networkConfig[31337].name]: 0,
            [networkConfig[11155111].name]: 0,
        },
    },
    solidity: {
        compilers: [
            {
                version: "0.8.20",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
        ],
    },
    mocha: {
        timeout: 500000,
    },
}
