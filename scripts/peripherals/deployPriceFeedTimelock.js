const { deployContract, contractAt, sendTxn } = require("../shared/helpers");
const { ethers } = require("hardhat");

const wallet = {};

async function main() {
  // Get the deployer signer from Hardhat
  const [deployer] = await ethers.getSigners();
  wallet.address = deployer.address;

  // Using the deployer as the signer
  const signer = deployer;

  const admin = wallet.address;
  const buffer = 24 * 60 * 60;
  const tokenManager = wallet.address;

  // Deploy the PriceFeedTimelock contract
  const timelock = await deployContract("PriceFeedTimelock", [
    admin,
    buffer,
    tokenManager
  ], "Timelock");

  const deployedTimelock = await contractAt("PriceFeedTimelock", timelock.address, signer);

  const signers = [
    wallet.address
    // Add other signer addresses here if needed
  ];

  for (let i = 0; i < signers.length; i++) {
    // Uncomment this line to set contract handlers if needed
    // await sendTxn(deployedTimelock.setContractHandler(signers[i], true), `deployedTimelock.setContractHandler(${signers[i]})`);
  }

  const keepers = [
    wallet.address // Add other keeper addresses here if needed
  ];

  for (let i = 0; i < keepers.length; i++) {
    const keeper = keepers[i];
    // Uncomment this line to set keepers if needed
    // await sendTxn(deployedTimelock.setKeeper(keeper, true), `deployedTimelock.setKeeper(${keeper})`);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
