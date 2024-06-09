const { etheres } = require('hardhat')
const { deployContract, sendTxn, writeTmpAddresses, callWithRetries, sleep, getFrameSigner } = require("./shared/helpers")
const { expandDecimals } = require("../test/shared/utilities")
const network = (process.env.HARDHAT_NETWORK || 'mainnet');
const tokens = require('./core/tokens')[network];
const gasLimit = 30000000
const gov = { address: "0x49B373D422BdA4C6BfCdd5eC1E48A9a26fdA2F8b" }
const { toUsd } = require("../test/shared/units")
const { errors } = require("../test/core/Vault/helpers");
const { ADDRESS_ZERO } = require('@uniswap/v3-sdk');
const { AddressZero } = ethers.constants
const weth = { address: "0xcF664087a5bB0237a0BAd6742852ec6c8d69A27a" }
const wallet = { address: "0xcDF2A6446cd43B541fC768195eFE1f82c846F953" }
const bnAlp = { address: AddressZero }
const alp = { address: AddressZero }
const vestingDuration = 365 * 24 * 60 * 60

const busdAddress = "0x1Aa1F7815103c0700b98f24138581b88d4cf9769";

async function main() {
    const { nativeToken } = tokens
    const [deployer] = await ethers.getSigners()
    wallet.address = deployer.address

    // deployed addresses
    const addresses = {
        Vault: "",
        USDG: "",
        Reader: "",
        RewardReader: "",
        VaultReader: "",
        Router: "",
        VaultPriceFeed: "",
        GLP: "",
        ShortsTracker: "",
        GlpManager: "",
        VaultErrorController: "",
        VaultUtils: "",
        bnGMX: "",
        esGMX: "",
        GMX: "",
        sGMX: "",
        sGMXDistributor: "",
        sbfGMX: "",
        sbfGMXDistributor: "",
        RewardRouter: "",
        VesterGMX: "",
        VestedGLP: "",
    }

    // 1 - Reader ------------------------------------------------------------------
    const reader = await deployContract("Reader", [], "Reader")
    if (network === "mainnet") {
        await sendTxn(reader.setConfig(true), "Reader.setConfig")
    }
    addresses.Reader = reader.address
    await sleep(1)

    // 2 - RewardReader ------------------------------------------------------------
    const rewardReader = await deployContract("RewardReader", [], "RewardReader")
    addresses.RewardReader = rewardReader.address
    await sleep(1)

    // 3 - VaultReader -------------------------------------------------------------
    const vaultReader = await deployContract("VaultReader", [], "VaultReader")
    addresses.VaultReader = vaultReader.address
    await sleep(1)

    // 4 - Vault --------------------------------------------------------------------
    const vault = await deployContract("Vault", [])
    addresses.Vault = vault.address
    await sleep(1)

    // 5 - USDG --------------------------------------------------------------------
    const usdg = await deployContract("USDG", [vault.address])
    addresses.USDG = usdg.address
    await sleep(1)

    // 6 - Router ------------------------------------------------------------------
    const router = await deployContract("Router", [vault.address, usdg.address, nativeToken.address])
    addresses.Router = router.address
    await sleep(1)

    // 7 - VaultPriceFeed ----------------------------------------------------------
    const vaultPriceFeed = await deployContract("VaultPriceFeed", [])
    addresses.VaultPriceFeed = vaultPriceFeed.address
    await sleep(1)

    await sendTxn(vaultPriceFeed.setMaxStrictPriceDeviation(expandDecimals(1, 28)), "vaultPriceFeed.setMaxStrictPriceDeviation") // 0.05 USD
    await sleep(1)
    await sendTxn(vaultPriceFeed.setPriceSampleSpace(1), "vaultPriceFeed.setPriceSampleSpace")
    await sleep(1)
    await sendTxn(vaultPriceFeed.setIsAmmEnabled(false), "vaultPriceFeed.setIsAmmEnabled")
    await sleep(1)

    // 8 - GLP
    const glp = await deployContract("GLP", [])
    addresses.GLP = glp.address
    await sleep(1)
    await sendTxn(glp.setInPrivateTransferMode(true), "glp.setInPrivateTransferMode")
    await sleep(1)

    // 9 - ShortsTracker -----------------------------------------------------------
    const shortsTracker = await deployContract("ShortsTracker", [vault.address], "ShortsTracker", { gasLimit })
    addresses.ShortsTracker = shortsTracker.address
    await sendTxn(shortsTracker.setGov(gov.address), "shortsTracker.setGov")

    // 10 - GlpManager --------------------------------------------------------------
    const glpManager = await deployContract("GlpManager", [vault.address, usdg.address, glp.address, shortsTracker.address, 15 * 60])
    addresses.GlpManager = glpManager.address
    await sleep(1)
    await sendTxn(glpManager.setInPrivateMode(true), "glpManager.setInPrivateMode")
    await sleep(1)
    await sendTxn(glp.setMinter(glpManager.address, true), "glp.setMinter")
    await sleep(1)
    await sendTxn(usdg.addVault(glpManager.address), "usdg.addVault(glpManager)")
    await sleep(1)

    await sendTxn(vault.initialize(
        router.address, // router
        usdg.address, // usdg
        vaultPriceFeed.address, // priceFeed
        toUsd(2), // liquidationFeeUsd
        100, // fundingRateFactor
        100 // stableFundingRateFactor
    ), "vault.initialize")
    await sleep(1)

    await sendTxn(vault.setFundingRate(60 * 60, 100, 100), "vault.setFundingRate")
    await sleep(1)
    await sendTxn(vault.setInManagerMode(true), "vault.setInManagerMode")
    await sleep(1)
    await sendTxn(vault.setManager(glpManager.address, true), "vault.setManager")
    await sleep(1)

    await sendTxn(vault.setFees(
        10, // _taxBasisPoints
        5, // _stableTaxBasisPoints
        20, // _mintBurnFeeBasisPoints
        20, // _swapFeeBasisPoints
        1, // _stableSwapFeeBasisPoints
        10, // _marginFeeBasisPoints
        toUsd(2), // _liquidationFeeUsd
        24 * 60 * 60, // _minProfitTime
        true // _hasDynamicFees
    ), "vault.setFees")
    await sleep(1)

    // 11 - VaultErrorController ---------------------------------------------------
    const vaultErrorController = await deployContract("VaultErrorController", [])
    addresses.VaultErrorController = vaultErrorController.address
    await sleep(1)
    await sendTxn(vault.setErrorController(vaultErrorController.address), "vault.setErrorController")
    await sleep(1)
    await sendTxn(vaultErrorController.setErrors(vault.address, errors), "vaultErrorController.setErrors")
    await sleep(1)

    // 12 - VaultUtils -------------------------------------------------------------
    const vaultUtils = await deployContract("VaultUtils", [vault.address])
    addresses.VaultUtils = vaultUtils.address
    await sleep(1)
    await sendTxn(vault.setVaultUtils(vaultUtils.address), "vault.setVaultUtils")
    await sleep(1)
    writeTmpAddresses(addresses)

    // 13 - Bonus GMX --------------------------------------------------------------
    const bnGmx = await deployContract("MintableBaseToken", ["Bonus GMX", "bnGMX", 0]);
    addresses.bnGMX = bnGmx.address;
    await sleep(1)

    // 14 - EsGMX --------------------------------------------------------------------
    const esGmx = await deployContract("EsGMX", []);
    addresses.esGMX = esGmx.address;
    await sleep(1)

    // 15 - GMX --------------------------------------------------------------------
    const gmx = await deployContract("GMX", [])
    addresses.GMX = gmx.address
    await sleep(1)

    // 15 - RewardTracker ----------------------------------------------------------
    const stakedGmxTracker = await deployContract("RewardTracker", ["Staked GMX", "sGMX"])
    addresses.sGMX = stakedGmxTracker.address
    await sleep(1)

    // 15 - RewardTracker ----------------------------------------------------------
    const stakedGmxDistributor = await deployContract("RewardDistributor", [esGmx.address, stakedGmxTracker.address])
    addresses.sGMXDistributor = stakedGmxDistributor.address
    await sleep(1)
    await sendTxn(stakedGmxTracker.initialize([gmx.address, esGmx.address], stakedGmxDistributor.address), "stakedGmxTracker.initialize")
    await sleep(1)
    await sendTxn(stakedGmxDistributor.updateLastDistributionTime(), "stakedGmxDistributor.updateLastDistributionTime")
    await sleep(1)

    // 16 - Staked + Bonus GMX --------------------------------------------------------------------
    const bonusGmxTracker = await deployContract("RewardTracker", ["Staked + Bonus GMX", "sbGMX"])
    const bonusGmxDistributor = await deployContract("BonusDistributor", [bnGmx.address, bonusGmxTracker.address])
    await sendTxn(bonusGmxTracker.initialize([stakedGmxTracker.address], bonusGmxDistributor.address), "bonusGmxTracker.initialize")
    await sendTxn(bonusGmxDistributor.updateLastDistributionTime(), "bonusGmxDistributor.updateLastDistributionTime")

    // 17 - Staked + Bonus + Fee GMX --------------------------------------------------------------------
    const feeGmxTracker = await deployContract("RewardTracker", ["Staked + Bonus + Fee GMX", "sbfGMX"])
    addresses.sbfGMX = feeGmxTracker.address
    await sleep(1)
    const feeGmxDistributor = await deployContract("RewardDistributor", [weth.address, feeGmxTracker.address])
    addresses.sbfGMXDistributor = feeGmxDistributor.address
    await sleep(1)
    await sendTxn(feeGmxTracker.initialize([bonusGmxTracker.address, bnGmx.address], feeGmxDistributor.address), "feeGmxTracker.initialize")
    await sleep(1)
    await sendTxn(feeGmxDistributor.updateLastDistributionTime(), "feeGmxDistributor.updateLastDistributionTime")
    await sleep(1)

    const feeGlpTracker = { address: AddressZero }
    const stakedGlpTracker = { address: AddressZero }

    const stakedAlpTracker = { address: AddressZero }
    const bonusAlpTracker = { address: AddressZero }
    const feeAlpTracker = { address: AddressZero }

    await sendTxn(stakedGmxTracker.setInPrivateTransferMode(true), "stakedGmxTracker.setInPrivateTransferMode")
    await sleep(1)
    await sendTxn(stakedGmxTracker.setInPrivateStakingMode(true), "stakedGmxTracker.setInPrivateStakingMode")
    await sleep(1)
    await sendTxn(bonusGmxTracker.setInPrivateTransferMode(true), "bonusGmxTracker.setInPrivateTransferMode")
    await sleep(1)
    await sendTxn(bonusGmxTracker.setInPrivateStakingMode(true), "bonusGmxTracker.setInPrivateStakingMode")
    await sleep(1)
    await sendTxn(bonusGmxTracker.setInPrivateClaimingMode(true), "bonusGmxTracker.setInPrivateClaimingMode")
    await sleep(1)
    await sendTxn(feeGmxTracker.setInPrivateTransferMode(true), "feeGmxTracker.setInPrivateTransferMode")
    await sleep(1)
    await sendTxn(feeGmxTracker.setInPrivateStakingMode(true), "feeGmxTracker.setInPrivateStakingMode")
    await sleep(1)

    // 18 - Vester GMX -----------------------------------------------------------------
    const gmxVester = await deployContract("Vester", [
        "Vested GMX", // _name
        "vGMX", // _symbol
        vestingDuration, // _vestingDuration
        esGmx.address, // _esToken
        feeGmxTracker.address, // _pairToken
        gmx.address, // _claimableToken
        stakedGmxTracker.address, // _rewardTracker
    ])
    addresses.VesterGMX = gmxVester.address

    // 19 - Vester GLP --------------------------------------------------------------------
    const glpVested = await deployContract("Vester", [
        "Vested GLP", // _name
        "vGLP", // _symbol
        vestingDuration, // _vestingDuration
        esGmx.address, // _esToken
        stakedGlpTracker.address, // _pairToken
        gmx.address, // _claimableToken
        stakedGlpTracker.address, // _rewardTracker
    ])
    addresses.VestedGLP = gmxVester.address

    // 18 - RewardRouter --------------------------------------------------------------
    const rewardRouter = await deployContract("RewardRouterV2", [])
    addresses.RewardRouter = rewardRouter.address
    await sleep(1)
    await sendTxn(rewardRouter.initialize(
        nativeToken.address,
        gmx.address,
        esGmx.address,
        bnGmx.address,
        glp.address,
        stakedGmxTracker.address,
        bonusGmxTracker.address,
        feeGmxTracker.address,
        feeGlpTracker.address,
        stakedGlpTracker.address,
        glpManager.address,
        gmxVester.address,
        glpVested.address
    ), "rewardRouter.initialize")

    // allow rewardRouter to stake in stakedGmxTracker
    await sendTxn(stakedGmxTracker.setHandler(rewardRouter.address, true), "stakedGmxTracker.setHandler(rewardRouter)")
    await sleep(1)

    // allow bonusGmxTracker to stake stakedGmxTracker
    await sendTxn(stakedGmxTracker.setHandler(bonusGmxTracker.address, true), "stakedGmxTracker.setHandler(bonusGmxTracker)")
    await sleep(1)

    // allow rewardRouter to stake in bonusGmxTracker
    await sendTxn(bonusGmxTracker.setHandler(rewardRouter.address, true), "bonusGmxTracker.setHandler(rewardRouter)")
    await sleep(1)

    // allow bonusGmxTracker to stake feeGmxTracker
    await sendTxn(bonusGmxTracker.setHandler(feeGmxTracker.address, true), "bonusGmxTracker.setHandler(feeGmxTracker)")
    await sleep(1)

    await sendTxn(bonusGmxDistributor.setBonusMultiplier(10000), "bonusGmxDistributor.setBonusMultiplier")
    await sleep(1)

    // allow rewardRouter to stake in feeGmxTracker
    await sendTxn(feeGmxTracker.setHandler(rewardRouter.address, true), "feeGmxTracker.setHandler(rewardRouter)")
    await sleep(1)

    // allow stakedGmxTracker to stake esGmx
    await sendTxn(esGmx.setHandler(stakedGmxTracker.address, true), "esGmx.setHandler(stakedGmxTracker)")
    await sleep(1)

    // allow feeGmxTracker to stake bnGmx
    await sendTxn(bnGmx.setHandler(feeGmxTracker.address, true), "bnGmx.setHandler(feeGmxTracker")
    await sleep(1)

    // allow rewardRouter to burn bnGmx
    await sendTxn(bnGmx.setMinter(rewardRouter.address, true), "bnGmx.setMinter(rewardRouter")
    await sleep(1)

    // mint esGmx for distributors
    await sendTxn(esGmx.setMinter(wallet.address, true), "esGmx.setMinter(wallet)")
    await sleep(1)

    await sendTxn(esGmx.mint(stakedGmxDistributor.address, expandDecimals(50000 * 12, 18)), "esGmx.mint(stakedGmxDistributor") // ~50,000 GMX per month
    await sleep(1)

    await sendTxn(stakedGmxDistributor.setTokensPerInterval("20667989410000000"), "stakedGmxDistributor.setTokensPerInterval") // 0.02066798941 esGmx per second
    await sleep(1)

    // mint bnGmx for distributor
    await sendTxn(bnGmx.setMinter(wallet.address, true), "bnGmx.setMinter")
    await sleep(1)

    await sendTxn(bnGmx.mint(bonusGmxDistributor.address, expandDecimals(15 * 1000 * 1000, 18)), "bnGmx.mint(bonusGmxDistributor)")
    await sleep(1)

    const depositFee = 50
    const minExecutionFee = 4000

    await deployContract("PositionRouter", [
        addresses.Vault,
        router.address,
        weth.address,
        addresses.ShortsTracker,
        depositFee,
        minExecutionFee
    ], "PositionRouter")

    await deployContract("PositionManager", [
        addresses.Vault,
        addresses.Reader,
        addresses.ShortsTracker,
        busdAddress,
        50,
        ADDRESS_ZERO
    ], "PositionManager")

    ///////////////// addLiquidity TESTING ////////////////
    let bnb = await deployContract("Token", [])

    await bnb.mint(deployer.address, expandDecimals(1, 20))

    console.log('balanceOf', Number(await bnb.balanceOf(deployer.address)));

    let priceFeed = await deployContract("PriceFeed", [], "PriceFeed");

    await sendTxn(priceFeed.setLatestAnswer(toChainlinkPrice(1)), 'priceFeed.setLatestAnswer');

    await sendTxn(vaultPriceFeed.setTokenConfig(
        bnb.address,
        priceFeed.address,
        18,
        false
    ), 'vaultPriceFeed.setTokenConfig');

    await sendTxn(vault.setTokenConfig(
        bnb.address, // _token
        18, // _tokenDecimals
        10000, // _tokenWeight
        75, // _minProfitBps
        expandDecimals(1, 32),
        false, // _isStable
        false // _isShortable
    ), 'vault.setTokenConfig');

    console.log('getMinPrice', Number(await vault.getMinPrice(bnb.address)));

    await sendTxn(bnb.approve(glpManager.address, expandDecimals(1, 20)), 'bnb.aprove');

    await sendTxn(glpManager.setInPrivateMode(false), 'glpManager.setInPrivateMode(false)');

    await sendTxn(glpManager.addLiquidity(
        bnb.address,
        expandDecimals(1, 18),
        expandDecimals(1, 7),
        expandDecimals(1, 7),
    ), 'glpManager.addLiquidity');
}

function toChainlinkPrice(value) {
    return parseInt(value * Math.pow(10, 8))
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })