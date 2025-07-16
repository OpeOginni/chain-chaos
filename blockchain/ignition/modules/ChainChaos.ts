// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const USDC_TOKEN_MAINNET = "0x796Ea11Fa2dD751eD01b53C372fFDB4AAa8f00F9";

const ChainChaosModule = buildModule("ChainChaosModule", (m) => {
  const usdcToken = m.getParameter("usdcToken", USDC_TOKEN_MAINNET);

  const chainChaos = m.contract("ChainChaos", [usdcToken]);

  return { chainChaos };
});

export default ChainChaosModule;

// npx hardhat ignition deploy ignition/modules/ChainChaos.ts --network etherlinkMainnet
