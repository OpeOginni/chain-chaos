import Image from 'next/image'
import { CurrencyType } from '@/lib/types'
import { cn } from '@/lib/utils'

interface TokenIconProps {
  currencyType: CurrencyType
  size?: number
  className?: string
}

export function TokenIcon({ currencyType, size = 20, className }: TokenIconProps) {
  const getTokenInfo = (type: CurrencyType) => {
    switch (type) {
      case CurrencyType.XTZ:
        return {
          src: '/token/xtz.svg',
          alt: 'XTZ Token',
          symbol: 'XTZ'
        }
      case CurrencyType.USDC:
        return {
          src: '/token/usdc.svg',
          alt: 'USDC Token',
          symbol: 'USDC'
        }
      default:
        return {
          src: '/token/xtz.svg',
          alt: 'Token',
          symbol: 'XTZ'
        }
    }
  }

  const tokenInfo = getTokenInfo(currencyType)

  return (
    <Image
      src={tokenInfo.src}
      alt={tokenInfo.alt}
      width={size}
      height={size}
      className={cn('inline-block token-icon', className)}
    />
  )
}

// Export a simple function to get token symbol
export function getTokenSymbol(currencyType: CurrencyType): string {
  switch (currencyType) {
    case CurrencyType.XTZ:
      return 'XTZ'
    case CurrencyType.USDC:
      return 'USDC'
    default:
      return 'XTZ'
  }
} 