// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const USDC_TOKEN_TESTNET = "0x4C2AA252BEe766D3399850569713b55178934849";

const ChainChaosModule = buildModule("ChainChaosModule", (m) => {
  const usdcToken = m.getParameter("usdcToken", USDC_TOKEN_TESTNET);

  const chainChaos = m.contract("ChainChaos", [usdcToken]);

  return { chainChaos };
});

export default ChainChaosModule;

// npx hardhat ignition deploy ignition/modules/ChainChaos.Testnet.ts --network etherlinkTestnet
