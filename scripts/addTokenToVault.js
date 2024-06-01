const { Web3 } = require('web3');
const glpManagerJson = require('./abis/GlpManager.json');
const vaultJson = require('./abis/Vault.json');
const vaultPriceFeedJson = require('./abis/VaultPriceFeed.json');
const priceFeedJson = require('./abis/PriceFeed.json');
const vaultReaderJson = require('./abis/VaultReader.json');
const tokenJson = require('./abis/Token.json');

const web3 = new Web3("https://api.harmony.one");

const mul = "1000000000000000000";
const gasLimit = 9721900;
// gasPrice: 101000000000

const privateKey = '';
const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);
web3.eth.accounts.wallet.add(account);
web3.eth.defaultAccount = account.address;

function toChainlinkPrice(value) {
    return parseInt(value * Math.pow(10, 8))
}

const vaultAddress = "0x45440437e3f8dF7B4b99f0CdCA6E14B46765d791";
const vaultPriceFeedAddress = "0x645e043AEC2F13bFf4369Cc81353ae4f4625278D";

const addTokenToVault = async ({
    tokenAddress, lastPrice, priceFeedAddress, isStable = false
}) => {
    const priceFeedContract = new web3.eth.Contract(priceFeedJson.abi, priceFeedAddress);

    let req = await priceFeedContract.methods.setLatestAnswer(lastPrice).send({
        from: account.address,
        gas: gasLimit,
        gasPrice: 101000000000,
    });

    console.log(req);

    // -----------------------------------
    const vaultPriceFeedContract = new web3.eth.Contract(vaultPriceFeedJson.abi, vaultPriceFeedAddress);

    req = await vaultPriceFeedContract.methods.setTokenConfig(
        tokenAddress,
        priceFeedAddress,
        18,
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

    // -----------------------------------
    const vaultContract = new web3.eth.Contract(vaultJson.abi, vaultAddress);

    req = await vaultContract.methods.setPriceFeed(vaultPriceFeedAddress).send({
        from: account.address,
        gas: gasLimit,
        gasPrice: 101000000000,
    });

    console.log(1, req);

    req = await vaultContract.methods.setTokenConfig(
        tokenAddress, // _token
        18, // _tokenDecimals
        10000, // _tokenWeight
        75, // _minProfitBps
        100 * Math.pow(10, 30),
        isStable, // _isStable
        false // _isShortable
    ).send({
        from: account.address,
        gas: gasLimit,
        gasPrice: 101000000000,
    });

    console.log(2, req.transactionHash);

    req = await vaultContract.methods.getMinPrice(tokenAddress).call();

    console.log(3, req);

    req = await vaultContract.methods.usdgAmounts(tokenAddress).call();

    console.log(4, req);
}

// should be deployed previously
const priceFeedAddressWONE = "0x2C5E75a0d4ad94961EBEf4bFCFDEe284B7BD18c6";
const priceFeedAddressBUSD = "0xB047503a8B82416499EA2A54F29c51DEE85442a1";

const busdTokenAddress = "0x1Aa1F7815103c0700b98f24138581b88d4cf9769";
const woneTokenAddress = "0xcF664087a5bB0237a0BAd6742852ec6c8d69A27a";

addTokenToVault({
    tokenAddress: busdTokenAddress,
    lastPrice: toChainlinkPrice(1), 
    priceFeedAddress: priceFeedAddressBUSD,
    isStable: false
});

addTokenToVault({
    tokenAddress: woneTokenAddress,
    lastPrice: toChainlinkPrice(0.02), 
    priceFeedAddress: priceFeedAddressWONE,
    isStable: false
});