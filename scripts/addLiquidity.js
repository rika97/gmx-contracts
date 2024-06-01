const { Web3 } = require('web3');
const glpManagerJson = require('./abis/GlpManager.json');
const vaultJson = require('./abis/Vault.json');
const vaultPriceFeedJson = require('./abis/VaultPriceFeed.json');
const priceFeedJson = require('./abis/PriceFeed.json');
const vaultReaderJson = require('./abis/VaultReader.json');
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

const glpManagerAddress = "0xe51CB3361dE553fb7B75B49E5552e9D47B4aeDb0";

const addLiquidity = async (tokenAddress, amount) => {
    const erc20Contract = new web3.eth.Contract(tokenJson.abi, tokenAddress);
    const glpManagerContract = new web3.eth.Contract(glpManagerJson.abi, glpManagerAddress);

    try {
        await erc20Contract.methods.approve(glpManagerAddress, amount).send({
            from: account.address,
            gas: gasLimit,
            gasPrice: 101000000000,
        });

        let req = await erc20Contract.methods.balanceOf(account.address).call();
        console.log('balanceOf: ', req);

        req = await glpManagerContract.methods.setInPrivateMode(false).send({
            from: account.address,
            gas: gasLimit,
            gasPrice: 101000000000,
        });

        console.log(2, req);

        console.log(new BN(1).mul(new BN(mul)));

        req = await glpManagerContract.methods.addLiquidity(
            tokenAddress,
            amount,
            web3.utils.toWei(100000, 'Mwei'),
            web3.utils.toWei(100000, 'Mwei'),
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

const busdTokenAddress = "0x1Aa1F7815103c0700b98f24138581b88d4cf9769";
const woneTokenAddress = "0xcF664087a5bB0237a0BAd6742852ec6c8d69A27a";

addLiquidity(
  busdTokenAddress, 
  web3.utils.toWei(100000000000, 'Mwei')
);

addLiquidity(
  woneTokenAddress, 
  web3.utils.toWei(100000000000, 'Mwei')
);