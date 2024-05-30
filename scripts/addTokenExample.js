const { Web3 } = require('web3');
const glpManagerJson = require('./abis/GlpManager.json');
const vaultJson = require('./abis/Vault.json');
const vaultPriceFeedJson = require('./abis/VaultPriceFeed.json');
const priceFeedJson = require('./abis/PriceFeed.json');
const tokenJson = require('./abis/Token.json');
const { Contract } = require('web3-eth-contract');
// import { withDecimals } from '../utils';
const BN = require('bn.js');

const web3 = new Web3("https://api.harmony.one");

const mul = "1000000000000000000";
const gasLimit = 9721900;
// gasPrice: 101000000000

const privateKey = '';
const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);
web3.eth.accounts.wallet.add(account);
web3.eth.defaultAccount = account.address;

const busdAddress = "0x1Aa1F7815103c0700b98f24138581b88d4cf9769";

function toChainlinkPrice(value) {
    return parseInt(value * Math.pow(10, 8))
}

const addTokenToVault = async () => {
    const priceFeedContract = new web3.eth.Contract(priceFeedJson.abi, "0x357C9A64cE1A17FBeB5239e6477A2e34663C31a0");

    let req = await priceFeedContract.methods.setLatestAnswer(toChainlinkPrice(1)).send({
        from: account.address,
        gas: gasLimit,
        gasPrice: 101000000000,
    });

    console.log(req);

    // -----------------------------------
    const vaultPriceFeedContract = new web3.eth.Contract(vaultPriceFeedJson.abi, "0xEb3d5f22935d89C089289e418a7c63C697286AD5");

    req = await vaultPriceFeedContract.methods.setTokenConfig(
        busdAddress,
        '0x357C9A64cE1A17FBeB5239e6477A2e34663C31a0',
        18,
        true
    ).send({
        from: account.address,
        gas: gasLimit,
        gasPrice: 101000000000,
    })

    console.log('vaultPriceFeedContract.setTokenConfig: ', req.transactionHash);    

    req = await vaultPriceFeedContract.methods.getPrice(
        busdAddress,
        true, 
        true,
        true
    ).call();

    console.log('vaultPriceFeedContract.getPrice: ', req);

    req = await vaultPriceFeedContract.methods.setTokenConfig(
        busdAddress,
        "0x357C9A64cE1A17FBeB5239e6477A2e34663C31a0",
        18,
        true
    ).send({
        from: account.address,
        gas: gasLimit,
        gasPrice: 101000000000,
    });

    console.log(req);

    // return;
    // -----------------------------------
    const vaultContract = new web3.eth.Contract(vaultJson.abi, "0x67A3d0ca991ca3a52dF078536C2368eF6117D815");

    req = await vaultContract.methods.setPriceFeed('0xEb3d5f22935d89C089289e418a7c63C697286AD5').send({
        from: account.address,
        gas: gasLimit,
        gasPrice: 101000000000,
    });

    console.log(1, req);

    req = await vaultContract.methods.setTokenConfig(
        busdAddress, // _token
        18, // _tokenDecimals
        10000, // _tokenWeight
        75, // _minProfitBps
        0, // _maxUsdgAmount
        true, // _isStable
        false // _isShortable
    ).send({
        from: account.address,
        gas: gasLimit,
        gasPrice: 101000000000,
    });

    console.log(2, req);

    req = await vaultContract.methods.getMinPrice(busdAddress).call();

    console.log(3, req);
}

const start = async () => {
    const erc20Contract = new web3.eth.Contract(tokenJson.abi, busdAddress);
    const glpManagerContract = new web3.eth.Contract(glpManagerJson.abi, "0x4f23528781084bB8c8F06ED73F417982fb2409cE");

    try {
        let req = await erc20Contract.methods.balanceOf("0xcDF2A6446cd43B541fC768195eFE1f82c846F953").call();
        console.log(1, req);

        req = await glpManagerContract.methods.setInPrivateMode(false).send({
            from: account.address,
            gas: gasLimit,
            gasPrice: 101000000000,
        });

        console.log(2, req);

        console.log(new BN(1).mul(new BN(mul)));

        req = await glpManagerContract.methods.addLiquidity(
            busdAddress,
            web3.utils.toWei(1, 'wei'),
            web3.utils.toWei(1, 'wei'),
            web3.utils.toWei(1, 'wei'),
        ).send({
            from: account.address,
            gas: gasLimit,
            gasPrice: 101000000000,
        });

        console.log(3, req);
    } catch (e) {
        console.error(e);
    }
}

addTokenToVault();
// start();