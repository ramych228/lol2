require('hardhat-deploy');
require("@nomiclabs/hardhat-waffle");
require("@nomicfoundation/hardhat-verify");
const dotenv = require('dotenv/config');

module.exports = {
  namedAccounts: {
    deployer: {
      default: 0
  },
  recipient: {
      default: 1,
  },
  anotherAccount: {
      default: 2
  }
  },
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  networks: {
    arbitrum_one: {
      url: process.env.ARBITRUM_URL,
      accounts: [process.env.PK]
    },
  },
  etherscan: {
    apiKey: {
      arbitrumOne: process.env.ARBISCAN_API_KEY,
    }
  },
  mocha: {
    timeout: 100000000
  }
};

