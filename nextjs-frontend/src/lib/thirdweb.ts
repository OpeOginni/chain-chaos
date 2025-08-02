import { defineChain } from "thirdweb/chains";
import { getContract } from "thirdweb";
import { client } from "./client";
import { ChainChaosABI } from "@/blockchain/ChainChaosABI";

// Etherlink Mainnet
export const etherlinkMainnet = defineChain({
  id: 42793,
  name: "Etherlink Mainnet",
  rpc: "https://node.mainnet.etherlink.com",
  nativeCurrency: {
    name: "Tez",
    symbol: "XTZ", 
    decimals: 18,
  },
  blockExplorers: [
    {
      name: "Etherlink Explorer",
      url: "https://explorer.etherlink.com",
      apiUrl: "https://explorer.etherlink.com/api",
    },
  ],
});

// Etherlink Testnet
export const etherlinkTestnet = defineChain({
  id: 128123,
  name: "Etherlink Testnet",
  rpc: "https://node.ghostnet.etherlink.com",
  nativeCurrency: {
    name: "Tez",
    symbol: "XTZ",
    decimals: 18,
  },
  blockExplorers: [
    {
      name: "Etherlink Testnet Explorer", 
      url: "https://testnet.explorer.etherlink.com",
      apiUrl: "https://testnet.explorer.etherlink.com/api",
    },
  ],
  testnet: true,
});

// Contract addresses by chain ID
const CONTRACT_ADDRESSES = {
  [etherlinkMainnet.id]: {
    chainChaos: process.env.NEXT_PUBLIC_CHAIN_CHAOS_MAINNET_ADDRESS,
    usdc: process.env.NEXT_PUBLIC_USDC_MAINNET_ADDRESS,
  },
  [etherlinkTestnet.id]: {
    chainChaos: process.env.NEXT_PUBLIC_CHAIN_CHAOS_TESTNET_ADDRESS,
    usdc: process.env.NEXT_PUBLIC_USDC_TESTNET_ADDRESS,
  },
} as const;

// Helper functions
export function getChainChaosAddress(chainId: number): `0x${string}` | undefined {
  const addresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
  return addresses?.chainChaos as `0x${string}` | undefined;
}

export function getUSDCAddress(chainId: number): `0x${string}` | undefined {
  const addresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
  return addresses?.usdc as `0x${string}` | undefined;
}

export function areAddressesAvailable(chainId: number): boolean {
  const chainChaosAddress = getChainChaosAddress(chainId);
  return !!chainChaosAddress;
}

export function isEtherlinkChain(chainId: number): boolean {
  return chainId === etherlinkMainnet.id || chainId === etherlinkTestnet.id;
}

export function getEtherlinkChainName(chainId: number): string {
  switch (chainId) {
    case etherlinkMainnet.id:
      return "Etherlink Mainnet";
    case etherlinkTestnet.id:
      return "Etherlink Testnet";
    default:
      return "Unknown Chain";
  }
}

// Contract instances
export function getChainChaosContract(chainId: number) {
  const address = getChainChaosAddress(chainId);
  if (!address) return null;
  
  const chain = chainId === etherlinkMainnet.id ? etherlinkMainnet : etherlinkTestnet;
  
  return getContract({
    client,
    chain,
    address,
    abi: ChainChaosABI,
  });
}

export function getUSDCContract(chainId: number) {
  const address = getUSDCAddress(chainId);
  if (!address) return null;
  
  const chain = chainId === etherlinkMainnet.id ? etherlinkMainnet : etherlinkTestnet;
  
  return getContract({
    client,
    chain,
    address,
  });
}

// Supported chains
export const supportedChains = [etherlinkMainnet, etherlinkTestnet];

// Default chain
export const defaultChain = etherlinkTestnet; 