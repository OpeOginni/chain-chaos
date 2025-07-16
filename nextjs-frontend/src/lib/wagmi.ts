import { createConfig, http } from 'wagmi'
import { mainnet, sepolia, hardhat } from 'wagmi/chains'
import { coinbaseWallet, injected, metaMask, walletConnect } from 'wagmi/connectors'
import { defineChain } from 'viem'

// Etherlink Mainnet Configuration
export const etherlinkMainnet = defineChain({
  id: 42793,
  name: 'Etherlink Mainnet',
  nativeCurrency: {
    decimals: 18,
    name: 'XTZ',
    symbol: 'XTZ',
  },
  rpcUrls: {
    default: { http: ['https://node.mainnet.etherlink.com'] },
  },
  blockExplorers: {
    default: { name: 'Etherlink Explorer', url: 'https://explorer.etherlink.com' },
  },
  testnet: false,
})

// Etherlink Testnet Configuration
export const etherlinkTestnet = defineChain({
  id: 128123,
  name: 'Etherlink Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'XTZ',
    symbol: 'XTZ',
  },
  rpcUrls: {
    default: { http: ['https://node.ghostnet.etherlink.com'] },
  },
  blockExplorers: {
    default: { name: 'Etherlink Testnet Explorer', url: 'https://testnet.explorer.etherlink.com' },
  },
  testnet: true,
})

// Helper function to check if a chain is Etherlink
export const isEtherlinkChain = (chainId: number | undefined): boolean => {
  return chainId === etherlinkMainnet.id || chainId === etherlinkTestnet.id
}

// Helper function to get the chain name for display
export const getEtherlinkChainName = (chainId: number | undefined): string => {
  switch (chainId) {
    case etherlinkMainnet.id:
      return 'Etherlink Mainnet'
    case etherlinkTestnet.id:
      return 'Etherlink Testnet'
    default:
      return 'Unknown Network'
  }
}

// Environment variable getters for each network
const getMainnetAddresses = () => ({
  chainChaos: process.env.NEXT_PUBLIC_CHAIN_CHAOS_ADDRESS_MAINNET as `0x${string}`,
  usdc: process.env.NEXT_PUBLIC_USDC_ADDRESS_MAINNET as `0x${string}`,
})

const getTestnetAddresses = () => ({
  chainChaos: process.env.NEXT_PUBLIC_CHAIN_CHAOS_ADDRESS_TESTNET as `0x${string}`,
  usdc: process.env.NEXT_PUBLIC_USDC_ADDRESS_TESTNET as `0x${string}`,
})

// Function to get contract addresses for a specific chain
export const getContractAddresses = (chainId: number | undefined) => {
  switch (chainId) {
    case etherlinkMainnet.id:
      return getMainnetAddresses()
    case etherlinkTestnet.id:
      return getTestnetAddresses()
    default:
      return { chainChaos: undefined, usdc: undefined }
  }
}

// Function to check if all required addresses are available for a chain
export const areAddressesAvailable = (chainId: number | undefined): boolean => {
  const addresses = getContractAddresses(chainId)
  return !!(addresses.chainChaos && addresses.usdc)
}

// Function to get ChainChaos address for current chain
export const getChainChaosAddress = (chainId: number | undefined): `0x${string}` | undefined => {
  return getContractAddresses(chainId).chainChaos
}

// Function to get USDC address for current chain
export const getUSDCAddress = (chainId: number | undefined): `0x${string}` | undefined => {
  return getContractAddresses(chainId).usdc
}

export const config = createConfig({
  chains: [etherlinkMainnet, etherlinkTestnet, sepolia, hardhat],
  connectors: [
    injected(),
    coinbaseWallet(),
    metaMask(),
    walletConnect({ 
      projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || '1' 
    }),
  ],
  transports: {
    [etherlinkMainnet.id]: http('https://node.mainnet.etherlink.com'),
    [etherlinkTestnet.id]: http('https://node.ghostnet.etherlink.com'),
    [sepolia.id]: http(),
    [hardhat.id]: http('http://127.0.0.1:8545'),
  },
})

// Legacy exports for backward compatibility - these will use the first available network
export const CHAIN_CHAOS_ADDRESS = getMainnetAddresses().chainChaos || getTestnetAddresses().chainChaos || '0x1234567890123456789012345678901234567890' as `0x${string}`
export const USDC_ADDRESS = getMainnetAddresses().usdc || getTestnetAddresses().usdc || '0x1234567890123456789012345678901234567890' as `0x${string}`

// Currency types from contract
export enum CurrencyType {
  NATIVE = 0,
  USDC = 1
}

export enum BetStatus {
  ACTIVE = 0,
  SETTLED = 1,
  CANCELLED = 2
}

export type BetInfo = {
  id: bigint
  category: string
  description: string
  currencyType: CurrencyType
  betAmount: bigint
  actualValue: bigint
  status: BetStatus
  totalPot: bigint
  refundMode: boolean
  playerBetCount: bigint
  createdAt: bigint
}

export type PlayerBet = {
  player: string
  guess: bigint
  claimed: boolean
} 