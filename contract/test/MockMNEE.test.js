const { expect } = require("chai")
const { ethers, deployments } = require("hardhat")

describe("MockMNEE", function () {
    let mockMNEE
    let deployer, user1, user2

    beforeEach(async function () {
        const signers = await ethers.getSigners()
        deployer = signers[0]
        user1 = signers[1]
        user2 = signers[2]

        await deployments.fixture(["mocks"])

        const MockMNEE = await deployments.get("MockMNEE")
        mockMNEE = await ethers.getContractAt("MockMNEE", MockMNEE.address)
    })

    describe("Deployment", function () {
        it("should have correct name and symbol", async function () {
            expect(await mockMNEE.name()).to.equal("Mock MNEE")
            expect(await mockMNEE.symbol()).to.equal("MNEE")
        })

        it("should have 18 decimals", async function () {
            expect(await mockMNEE.decimals()).to.equal(18)
        })

        it("should mint initial supply to deployer", async function () {
            const deployerBalance = await mockMNEE.balanceOf(deployer.address)
            expect(deployerBalance).to.equal(ethers.parseEther("1000000"))
        })
    })

    describe("Minting", function () {
        it("should allow anyone to mint tokens", async function () {
            const amount = ethers.parseEther("100")

            await mockMNEE.mint(user1.address, amount)

            expect(await mockMNEE.balanceOf(user1.address)).to.equal(amount)
        })

        it("should emit Transfer event on mint", async function () {
            const amount = ethers.parseEther("100")

            await expect(mockMNEE.mint(user1.address, amount))
                .to.emit(mockMNEE, "Transfer")
                .withArgs(ethers.ZeroAddress, user1.address, amount)
        })
    })

    describe("Transfers", function () {
        beforeEach(async function () {
            await mockMNEE.mint(user1.address, ethers.parseEther("1000"))
        })

        it("should transfer tokens between accounts", async function () {
            const amount = ethers.parseEther("100")

            await mockMNEE.connect(user1).transfer(user2.address, amount)

            expect(await mockMNEE.balanceOf(user2.address)).to.equal(amount)
        })

        it("should update balances after transfer", async function () {
            const amount = ethers.parseEther("100")
            const initialBalance = await mockMNEE.balanceOf(user1.address)

            await mockMNEE.connect(user1).transfer(user2.address, amount)

            expect(await mockMNEE.balanceOf(user1.address)).to.equal(initialBalance - amount)
        })
    })

    describe("Approvals", function () {
        it("should approve spender", async function () {
            const amount = ethers.parseEther("100")

            await mockMNEE.connect(user1).approve(user2.address, amount)

            expect(await mockMNEE.allowance(user1.address, user2.address)).to.equal(amount)
        })

        it("should allow transferFrom after approval", async function () {
            await mockMNEE.mint(user1.address, ethers.parseEther("1000"))
            const amount = ethers.parseEther("100")

            await mockMNEE.connect(user1).approve(user2.address, amount)
            await mockMNEE.connect(user2).transferFrom(user1.address, user2.address, amount)

            expect(await mockMNEE.balanceOf(user2.address)).to.equal(amount)
        })
    })
})
