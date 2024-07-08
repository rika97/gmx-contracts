const { getFrameSigner, deployContract, contractAt , sendTxn, readTmpAddresses, writeTmpAddresses } = require("../shared/helpers")
const { expandDecimals } = require("../../test/shared/utilities")
const { toUsd } = require("../../test/shared/units")

const network = (process.env.HARDHAT_NETWORK || 'mainnet');
const tokens = require('./tokens')[network];

const priceFeedAddressWONE = "0x2C5E75a0d4ad94961EBEf4bFCFDEe284B7BD18c6";
const woneTokenAddress = "0xcF664087a5bB0237a0BAd6742852ec6c8d69A27a";

const wallet = {}

async function getHarmonyValues(signer) {
  const wone = {
    name: "wone",
    address: woneTokenAddress,
    decimals: 18,
    priceFeed: priceFeedAddressWONE,
    fastPricePrecision: 100000000,
    maxCumulativeDeltaDiff: 250,
    priceDecimals: 8,
    isStrictStable: false
  };

  const [deployer] = await ethers.getSigners()
  wallet.address = deployer.address

  const tokenArr = [wone]
  const fastPriceTokens = [wone]

  const priceFeedTimelock = { address: "0xC5837D0acFbA7b6EECD964C18ff1DeCCC9b57A35" }

  const updaters = [wallet.address]

  const tokenManager = { address: wallet.address }

  const positionRouter = await contractAt("PositionRouter", "0xf3f6484E2C01961Eb0Fd4217a5d7D57A791B7771")
      
  // const fastPriceEvents = await contractAt("FastPriceEvents", "0x4530b7DE1958270A2376be192a24175D795e1b07", signer)
  const fastPriceEvents = await deployContract("FastPriceEvents", [])

  const chainlinkFlags = null;

  return {
    fastPriceTokens,
    fastPriceEvents,
    tokenManager,
    positionRouter,
    chainlinkFlags,
    tokenArr,
    updaters,
    priceFeedTimelock
  }
}

async function getValues(signer) {
    return getHarmonyValues(signer)
}

async function main() {
  const signer = await getFrameSigner()
  const deployer = { address: "0xcDF2A6446cd43B541fC768195eFE1f82c846F953" }

  const {
    fastPriceTokens,
    fastPriceEvents,
    tokenManager,
    positionRouter,
    chainlinkFlags,
    tokenArr,
    updaters,
    priceFeedTimelock
  } = await getValues(signer)

  const signers = [
    "0xcDF2A6446cd43B541fC768195eFE1f82c846F953"
    // "0x82429089e7c86B7047b793A9E7E7311C93d2b7a6", // coinflipcanada
    // "0x1D6d107F5960A66f293Ac07EDd08c1ffE79B548a", // G Account 1
    // "0xD7941C4Ca57a511F21853Bbc7FBF8149d5eCb398", // G Account 2
    // "0xfb481D70f8d987c1AE3ADc90B7046e39eb6Ad64B", // kr
    // "0x99Aa3D1b3259039E8cB4f0B33d0Cfd736e1Bf49E", // quat
    // "0x6091646D0354b03DD1e9697D33A7341d8C93a6F5", // xhiroz
    // "0x45e48668F090a3eD1C7961421c60Df4E66f693BD", // Dovey
    // "0x881690382102106b00a99E3dB86056D0fC71eee6", // Han Wen
    // "0x2e5d207a4c0f7e7c52f6622dcc6eb44bc0fe1a13" // Krunal Amin
  ]

  // if (fastPriceTokens.find(t => !t.fastPricePrecision)) {
  //   throw new Error("Invalid price precision")
  // }

  // if (fastPriceTokens.find(t => !t.maxCumulativeDeltaDiff)) {
  //   throw new Error("Invalid price maxCumulativeDeltaDiff")
  // }

  const secondaryPriceFeed = await deployContract("FastPriceFeed", [
    5 * 60, // _priceDuration
    60 * 60, // _maxPriceUpdateDelay
    1, // _minBlockInterval
    250, // _maxDeviationBasisPoints
    fastPriceEvents.address, // _fastPriceEvents
    deployer.address, // _tokenManager
    positionRouter.address
  ])

  const vaultPriceFeed = await deployContract("VaultPriceFeed", [])

  await sendTxn(vaultPriceFeed.setMaxStrictPriceDeviation(expandDecimals(1, 28)), "vaultPriceFeed.setMaxStrictPriceDeviation") // 0.01 USD
  await sendTxn(vaultPriceFeed.setPriceSampleSpace(1), "vaultPriceFeed.setPriceSampleSpace")
  await sendTxn(vaultPriceFeed.setSecondaryPriceFeed(secondaryPriceFeed.address), "vaultPriceFeed.setSecondaryPriceFeed")
  await sendTxn(vaultPriceFeed.setIsAmmEnabled(false), "vaultPriceFeed.setIsAmmEnabled")

  if (chainlinkFlags) {
    await sendTxn(vaultPriceFeed.setChainlinkFlags(chainlinkFlags.address), "vaultPriceFeed.setChainlinkFlags")
  }

  for (const [i, tokenItem] of tokenArr.entries()) {
    if (tokenItem.spreadBasisPoints === undefined) { continue }
    await sendTxn(vaultPriceFeed.setSpreadBasisPoints(
      tokenItem.address, // _token
      tokenItem.spreadBasisPoints // _spreadBasisPoints
    ), `vaultPriceFeed.setSpreadBasisPoints(${tokenItem.name}) ${tokenItem.spreadBasisPoints}`)
  }

  for (const token of tokenArr) {
    await sendTxn(vaultPriceFeed.setTokenConfig(
      token.address, // _token
      token.priceFeed, // _priceFeed
      token.priceDecimals, // _priceDecimals
      token.isStrictStable // _table
    ), `vaultPriceFeed.setTokenConfig(${token.name}) ${token.address} ${token.priceFeed}`)
  }

  await sendTxn(secondaryPriceFeed.initialize(1, signers, updaters), "secondaryPriceFeed.initialize")
  await sendTxn(secondaryPriceFeed.setTokens(fastPriceTokens.map(t => t.address), fastPriceTokens.map(t => t.fastPricePrecision)), "secondaryPriceFeed.setTokens")
  await sendTxn(secondaryPriceFeed.setVaultPriceFeed(vaultPriceFeed.address), "secondaryPriceFeed.setVaultPriceFeed")
  await sendTxn(secondaryPriceFeed.setMaxTimeDeviation(60 * 60), "secondaryPriceFeed.setMaxTimeDeviation")
  await sendTxn(secondaryPriceFeed.setSpreadBasisPointsIfInactive(50), "secondaryPriceFeed.setSpreadBasisPointsIfInactive")
  await sendTxn(secondaryPriceFeed.setSpreadBasisPointsIfChainError(500), "secondaryPriceFeed.setSpreadBasisPointsIfChainError")
  await sendTxn(secondaryPriceFeed.setMaxCumulativeDeltaDiffs(fastPriceTokens.map(t => t.address), fastPriceTokens.map(t => t.maxCumulativeDeltaDiff)), "secondaryPriceFeed.setMaxCumulativeDeltaDiffs")
  await sendTxn(secondaryPriceFeed.setPriceDataInterval(1 * 60), "secondaryPriceFeed.setPriceDataInterval")

  await sendTxn(positionRouter.setPositionKeeper(secondaryPriceFeed.address, true), "positionRouter.setPositionKeeper(secondaryPriceFeed)")
  await sendTxn(fastPriceEvents.setIsPriceFeed(secondaryPriceFeed.address, true), "fastPriceEvents.setIsPriceFeed")

  await sendTxn(vaultPriceFeed.setGov(priceFeedTimelock.address), "vaultPriceFeed.setGov")
  await sendTxn(secondaryPriceFeed.setGov(priceFeedTimelock.address), "secondaryPriceFeed.setGov")
  await sendTxn(secondaryPriceFeed.setTokenManager(tokenManager.address), "secondaryPriceFeed.setTokenManager")
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
