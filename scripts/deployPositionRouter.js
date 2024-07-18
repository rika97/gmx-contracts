const { etheres } = require('hardhat')
const { deployContract } = require("./shared/helpers")
const { expandDecimals } = require("../test/shared/utilities")
const network = (process.env.HARDHAT_NETWORK || 'mainnet');
const tokens = require('./core/tokens')[network];
const weth = { address: "0xcF664087a5bB0237a0BAd6742852ec6c8d69A27a" }
const wallet = { address: "0xcDF2A6446cd43B541fC768195eFE1f82c846F953" }

async function main() {
    const { nativeToken } = tokens
    const [deployer] = await ethers.getSigners()
    wallet.address = deployer.address

    const depositFee = 50
    const minExecutionFee = 4000

    await deployContract("PositionRouter", [
        "0x45440437e3f8dF7B4b99f0CdCA6E14B46765d791",
        "0x6b471Bb4999f0d61d08ab8546b631771538b7864",
        "0xcF664087a5bB0237a0BAd6742852ec6c8d69A27a",
        "0x2f2933e21C40886bdf7A8B50ee62f484FB2272bC",
        depositFee,
        minExecutionFee
    ], "PositionRouter")
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })