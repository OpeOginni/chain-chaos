import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    etherlinkMainnet: {
      url: process.env.ETHERLINK_MAINNET_RPC_URL,
      accounts: [process.env.PRIVATE_KEY!],
    },
    etherlinkTestnet: {
      url: process.env.ETHERLINK_TESTNET_RPC_URL,
      accounts: [process.env.PRIVATE_KEY!],
    }
  }
};

export default config;
