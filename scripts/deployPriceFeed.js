const { etheres } = require('hardhat')
const { deployContract, sendTxn, writeTmpAddresses, callWithRetries, sleep, getFrameSigner } = require("./shared/helpers")
const { expandDecimals } = require("../test/shared/utilities")
const network = (process.env.HARDHAT_NETWORK || 'mainnet');
const tokens = require('./core/tokens')[network];
const gasLimit = 30000000
const gov = { address: "0x49B373D422BdA4C6BfCdd5eC1E48A9a26fdA2F8b" }
const { toUsd } = require("../test/shared/units")
const { errors } = require("../test/core/Vault/helpers")
const { AddressZero } = ethers.constants
const weth = { address: "0xcF664087a5bB0237a0BAd6742852ec6c8d69A27a" }
const wallet = { address: "0xcDF2A6446cd43B541fC768195eFE1f82c846F953" }
const bnAlp = { address: AddressZero }
const alp = { address: AddressZero }
const vestingDuration = 365 * 24 * 60 * 60

async function main() {
    const { nativeToken } = tokens
    const [deployer] = await ethers.getSigners()
    wallet.address = deployer.address

    await deployContract("PriceFeed", [], "PriceFeed")
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })