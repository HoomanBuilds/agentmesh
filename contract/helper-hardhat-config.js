const networkConfig = {
    31337: {
        name: "hardhat",
        blockConfirmations: 1,
    },
    11155111: {
        name: "sepolia",
        blockConfirmations: 6,
    },
}

const developmentChains = ["hardhat", "localhost"]
const VERIFICATION_BLOCK_CONFIRMATIONS = 6

module.exports = {
    networkConfig,
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
}
