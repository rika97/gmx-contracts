const { deployContract, contractAt, sendTxn, getFrameSigner } = require("../shared/helpers")
const { expandDecimals } = require("../../test/shared/utilities")

const wallet = {};

async function main() {
  const [deployer] = await ethers.getSigners()
  wallet.address = deployer.address

  const signer = await getFrameSigner()

  const admin = wallet.address
  const buffer = 24 * 60 * 60

  const tokenManager = wallet.address;

  const timelock = await deployContract("PriceFeedTimelock", [
    admin,
    buffer,
    tokenManager
  ], "Timelock")

  const deployedTimelock = await contractAt("PriceFeedTimelock", timelock.address, signer)

  const signers = [
    wallet.address
    // "0x82429089e7c86B7047b793A9E7E7311C93d2b7a6", // coinflipcanada
    // "0xD7941C4Ca57a511F21853Bbc7FBF8149d5eCb398", // G
    // "0xfb481D70f8d987c1AE3ADc90B7046e39eb6Ad64B", // kr
    // "0x99Aa3D1b3259039E8cB4f0B33d0Cfd736e1Bf49E", // quat
    // "0x6091646D0354b03DD1e9697D33A7341d8C93a6F5" // xhiroz
  ]

  for (let i = 0; i < signers.length; i++) {
    // const signer = signers[i]
    // await sendTxn(deployedTimelock.setContractHandler(signers[i], true), `deployedTimelock.setContractHandler(${signers[i]})`)
  }

  const keepers = [
    wallet.address // X
  ]

  for (let i = 0; i < keepers.length; i++) {
    const keeper = keepers[i]
    // await sendTxn(deployedTimelock.setKeeper(keeper, true), `deployedTimelock.setKeeper(${keeper})`)
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
