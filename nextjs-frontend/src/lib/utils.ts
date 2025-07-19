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

// Format wei to gwei (for gas-related values - more readable than ETH)
export function formatWeiToGwei(value: bigint): string {
  return (Number(value) / 1e9).toFixed(2)
}

// Check if a category requires special wei formatting
export function isGasCategory(category: string): boolean {
  return ['base_fee_per_gas', 'burnt_fees', 'gas_used'].includes(category)
}

// Format actual value based on category - keep gas values as raw numbers
export function formatActualValue(value: bigint): string {
  // For gas categories, just show the raw wei value as it's more meaningful
  return value.toString()
}

// Get appropriate unit for a category
export function getCategoryUnit(category: string): string {
  switch (category) {
    case 'base_fee_per_gas':
      return 'wei'
    case 'burnt_fees':
      return 'wei'
    case 'gas_used':
      return 'wei'
    case 'xtz_price':
      return 'cents'
    case 'block_height':
    case 'block_count':
      return 'blocks'
    case 'transaction_count':
      return 'transactions'
    case 'network_activity':
      return 'score'
    case 'gas_price':
      return 'Gwei'
    default:
      return 'units'
  }
}

// Format currency amount with proper symbol
export function formatCurrencyAmount(value: bigint, currencyType: number): string {
  if (currencyType === 0) { // NATIVE
    return `${formatXTZ(value)} XTZ`
  } else { // USDC
    return `$${formatUSDC(value)} USDC`
  }
}

// Helper function to format time
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString()
}

// Helper function to format countdown
export function formatCountdown(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

// Helper function to format bet category
export function formatBetCategory(category: string): string {
  return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}
