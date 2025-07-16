import Image from 'next/image'
import { cn } from '@/lib/utils'

interface EtherlinkLogoProps {
  size?: number
  className?: string
}

export function EtherlinkLogo({ size = 80, className }: EtherlinkLogoProps) {
  return (
    <Image
      src="/chain/etherlink.svg"
      alt="Etherlink"
      width={size * 2}
      height={size}
      className={cn('inline-block', className)}
      priority
    />
  )
}

// Smaller icon version for badges and inline use
export function EtherlinkIcon({ size = 20, className }: { size?: number, className?: string }) {
  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      <div 
        className="w-full h-full rounded-full bg-primary flex items-center justify-center"
        style={{ 
          background: 'linear-gradient(135deg, #38ff9c 0%, #00d97a 100%)',
          boxShadow: '0 2px 8px rgba(56, 255, 156, 0.3)'
        }}
      >
        <div className="w-2/3 h-2/3 rounded-full bg-white/20 flex items-center justify-center">
          <div className="w-1/2 h-1/2 rounded-full bg-white/80"></div>
        </div>
      </div>
    </div>
  )
} 