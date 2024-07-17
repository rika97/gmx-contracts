const { Web3 } = require('web3');
const vaultJson = require('./abis/Vault.json');
const vaultPriceFeedJson = require('./abis/VaultPriceFeed.json');
const priceFeedJson = require('./abis/PriceFeed.json');
const { Contract } = require('web3-eth-contract');

const web3 = new Web3("https://api.harmony.one");

const gasLimit = 9721900;

const privateKey = 'xxx';
const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);
web3.eth.accounts.wallet.add(account);
web3.eth.defaultAccount = account.address;

function toChainlinkPrice(value) {
    return parseInt(value * Math.pow(10, 8))
}

const vaultAddress = "0x20cE89DC95602104bFEB31e081Ce274a43CA47A3";
const vaultPriceFeedAddress = "0x3F6E2f859639af5253c3bA027Be3716099fF1490";

const addTokenToVault = async ({
    tokenAddress, lastPrice, decimals, isStable = false
}) => {
    const contract = new web3.eth.Contract(priceFeedJson.abi);
    const txContract = await contract
        .deploy({
            data: priceFeedJson.bytecode,
            arguments: []
        })
        .send({
            from: account.address,
            gas: gasLimit,
            gasPrice: 101000000000,
        });
    const priceFeedAddress = `${txContract.options.address}`;
    console.log("Deployed PriceFeedContract contract to", priceFeedAddress);

    const priceFeedContract = new web3.eth.Contract(priceFeedJson.abi, priceFeedAddress);

    let req = await priceFeedContract.methods.setLatestAnswer(lastPrice).send({
        from: account.address,
        gas: gasLimit,
        gasPrice: 101000000000,
    });

    console.log('setLatestAnswer: ', req.transactionHash);

    // -----------------------------------
    const vaultPriceFeedContract = new web3.eth.Contract(vaultPriceFeedJson.abi, vaultPriceFeedAddress);

    req = await vaultPriceFeedContract.methods.setTokenConfig(
        tokenAddress,
        priceFeedAddress,
        8,
        isStable
    ).send({
        from: account.address,
        gas: gasLimit,
        gasPrice: 101000000000,
    })

    console.log('vaultPriceFeedContract.setTokenConfig: ', req.transactionHash);

    req = await vaultPriceFeedContract.methods.getPrice(
        tokenAddress,
        true,
        true,
        true
    ).call();

    console.log('vaultPriceFeedContract.getPrice: ', req);

    const vaultContract = new web3.eth.Contract(vaultJson.abi, vaultAddress);

    req = await vaultContract.methods.setPriceFeed(vaultPriceFeedAddress).send({
        from: account.address,
        gas: gasLimit,
        gasPrice: 101000000000,
    });

    console.log('setPriceFeed transactionHash:', req.transactionHash);

    req = await vaultContract.methods.setTokenConfig(
        tokenAddress, // _token
        decimals, // _tokenDecimals
        10000, // _tokenWeight
        75, // _minProfitBps
        100 * Math.pow(10, 30),
        isStable, // _isStable
        true // _isShortable
    ).send({
        from: account.address,
        gas: gasLimit,
        gasPrice: 101000000000,
    });

    console.log('setTokenConfig transactionHash:', req.transactionHash);

    req = await vaultContract.methods.getMinPrice(tokenAddress).call();

    console.log('Token min price: ', req);
}

const tokens = [
    {
        name: "Harmony ONE",
        symbol: "ONE",
        decimals: 18,
        address: "0x0000000000000000000000000000000000000000",
        isNative: true,
        isShortable: true,
        imageUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880",
        coingeckoUrl: "https://www.coingecko.com/en/coins/ethereum",
        isV1Available: true,
        defaultPrice: toChainlinkPrice(0.0145),
    },
    {
        name: "Wrapped ONE",
        symbol: "WONE",
        decimals: 18,
        address: "0xcF664087a5bB0237a0BAd6742852ec6c8d69A27a",
        isWrapped: true,
        baseSymbol: "ONE",
        imageUrl: "https://assets.coingecko.com/coins/images/2518/thumb/weth.png?1628852295",
        coingeckoUrl: "https://www.coingecko.com/en/coins/ethereum",
        isV1Available: true,
        defaultPrice: toChainlinkPrice(0.0145),
    },
    {
        name: "BUSD",
        symbol: "BUSD",
        decimals: 18,
        address: "0x1Aa1F7815103c0700b98f24138581b88d4cf9769",
        isStable: true,
        isV1Available: true,
        imageUrl: "https://etherscan.io/token/images/wormholebusdtoken_32.png",
        coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
        explorerUrl: "https://explorer.harmony.one/token/0x1Aa1F7815103c0700b98f24138581b88d4cf9769",
        defaultPrice: toChainlinkPrice(1),
    },
    {
        name: "Tether",
        symbol: "USDT",
        decimals: 6,
        address: "0xF2732e8048f1a411C63e2df51d08f4f52E598005",
        isStable: true,
        isV1Available: true,
        imageUrl: "https://etherscan.io/token/images/tethernew_32.png",
        coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
        explorerUrl: "https://explorer.harmony.one/token/0xF2732e8048f1a411C63e2df51d08f4f52E598005",
        defaultPrice: toChainlinkPrice(1),
    },
    {
        name: "USD Coin",
        symbol: "USDC",
        decimals: 6,
        address: "0xBC594CABd205bD993e7FfA6F3e9ceA75c1110da5",
        isStable: true,
        isV1Available: true,
        imageUrl: "https://etherscan.io/token/images/centre-usdc_28.png",
        coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
        explorerUrl: "https://explorer.harmony.one/token/0xBC594CABd205bD993e7FfA6F3e9ceA75c1110da5",
        defaultPrice: toChainlinkPrice(1),
    },
    {
        name: "Wrapped BTC",
        symbol: "WBTC",
        assetSymbol: "WBTC",
        decimals: 8,
        address: "0x118f50d23810c5E09Ebffb42d7D3328dbF75C2c2",
        isStable: false,
        isV1Available: true,
        imageUrl: "https://assets.coingecko.com/coins/images/26115/thumb/btcb.png?1655921693",
        coingeckoUrl: "https://www.coingecko.com/en/coins/wrapped-bitcoin",
        explorerUrl: "https://explorer.harmony.one/token/0x118f50d23810c5E09Ebffb42d7D3328dbF75C2c2",
        defaultPrice: toChainlinkPrice(63599),
    },
    {
        name: "Ethereum",
        symbol: "ETH",
        assetSymbol: "1ETH",
        decimals: 18,
        address: "0x4cC435d7b9557d54d6EF02d69Bbf72634905Bf11",
        isStable: false,
        isV1Available: true,
        imageUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880",
        coingeckoUrl: "https://www.coingecko.com/en/coins/ethereum",
        explorerUrl: "https://explorer.harmony.one/token/0x4cC435d7b9557d54d6EF02d69Bbf72634905Bf11",
        defaultPrice: toChainlinkPrice(3405),
    },
]

const start = async () => {
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        console.log(`------------`);
        console.log(`Deploy ${tokens[i].name}`);

        await addTokenToVault({
            tokenAddress: tokens[i].address,
            lastPrice: tokens[i].defaultPrice,
            isStable: tokens[i].isStable,
            decimals: tokens[i].decimals,
        });
    }
}

start();