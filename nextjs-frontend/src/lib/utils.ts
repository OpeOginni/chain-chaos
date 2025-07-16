import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format currency amounts
export function formatEther(value: bigint): string {
  return (Number(value) / 1e18).toFixed(4)
}

export function formatXTZ(value: bigint): string {
  return (Number(value) / 1e18).toFixed(4)
}

export function formatUSDC(value: bigint): string {
  return (Number(value) / 1e6).toFixed(2)
}

// Format address
export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// Format bet category for display
export function formatBetCategory(category: string): string {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Time formatting
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString()
}

// Format currency amount with proper symbol
export function formatCurrencyAmount(value: bigint, currencyType: number): string {
  if (currencyType === 0) { // NATIVE
    return `${formatXTZ(value)} XTZ`
  } else { // USDC
    return `$${formatUSDC(value)} USDC`
  }
}
