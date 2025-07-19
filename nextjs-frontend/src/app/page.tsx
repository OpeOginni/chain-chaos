'use client'

import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useChainId } from 'wagmi'
import { useWalletConnection } from '@/hooks/useWalletConnection'
import { WalletConnection } from '@/components/WalletConnection'
import { CurrentBet } from '@/components/CurrentBet'
import { NetworkStatus } from '@/components/NetworkStatus'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { EtherlinkLogo } from '@/components/ui/EtherlinkLogo'
import { ChainChaosABI } from '@/blockchain/ChainChaosABI'
import { 
  getChainChaosAddress,
  areAddressesAvailable,
  isEtherlinkChain 
} from '@/lib/wagmi'
import { Gamepad2, Settings, AlertTriangle, History } from 'lucide-react'
import Link from 'next/link'
import { WinnerNotifications } from '@/components/WinnerNotifications'

export default function Home() {
  const { address } = useAccount()
  const { isConnected } = useWalletConnection()
  const chainId = useChainId()
  const [isOwner, setIsOwner] = useState(false)

  const chainChaosAddress = getChainChaosAddress(chainId)
  const addressesAvailable = areAddressesAvailable(chainId)
  const isEtherlink = isEtherlinkChain(chainId)

  // Only run contract calls if addresses are available
  const contractCallsEnabled = isConnected && chainChaosAddress && addressesAvailable

  // Read contract owner
  const { data: owner } = useReadContract({
    address: chainChaosAddress,
    abi: ChainChaosABI,
    functionName: 'owner',
    query: {
      enabled: contractCallsEnabled,
    },
  })

  // Check if user is owner
  useEffect(() => {
    if (owner && address) {
      setIsOwner(owner.toLowerCase() === address.toLowerCase())
    } else {
      setIsOwner(false)
    }
  }, [owner, address])

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  🎲 ChainChaos
                </h1>
                <div className="hidden md:flex items-center gap-4">
                  <Link href="/history">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <History className="h-4 w-4" />
                      History
                    </Button>
                  </Link>
                  <Link href="/admin">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Settings className="h-4 w-4" />
                      Admin
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <WalletConnection />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 space-y-8">
          {/* Winner Notifications */}
          <WinnerNotifications />
          
          {/* Current Bet */}
          <CurrentBet />
        </main>

        {/* Footer */}
        <footer className="border-t bg-white/50 dark:bg-gray-950/50 backdrop-blur-sm mt-auto">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                <p>🎲 ChainChaos - Bet on the heartbeat of Etherlink</p>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <Link href="/history" className="hover:text-foreground transition-colors">
                  Betting History
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
