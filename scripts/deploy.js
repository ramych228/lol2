const { deployments, ethers, getNamedAccounts } = require('hardhat');
const hardhat = require("hardhat");
const hre = require("hardhat");

async function main() {
    await hardhat.run("compile");

    let deployer = await getNamedAccounts();
    console.log(deployer);

    let sub = await deployments.deploy("Bookmaker", {
        from: deployer.deployer,
        args: [],
        log: true,
    });


}



main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });