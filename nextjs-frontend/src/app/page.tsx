'use client'

import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useChainId } from 'wagmi'
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
import { Gamepad2, Settings, AlertTriangle } from 'lucide-react'

export default function HomePage() {
  const { address, isConnected } = useAccount()
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 flex flex-col">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/95 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Gamepad2 className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold gradient-text">ChainChaos</h1>
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-muted-foreground text-sm">powered by</span>
                <EtherlinkLogo size={20} />
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <NetworkStatus />

              {isOwner && (
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/admin'}
                  className="hidden sm:flex"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Admin
                </Button>
              )}
              <WalletConnection />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-1">
        {!isEtherlink ? (
          // Show network selection for non-Etherlink networks
          <div className="max-w-md mx-auto text-center space-y-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                ChainChaos is only available on Etherlink networks. Please switch to continue.
              </AlertDescription>
            </Alert>
            <NetworkStatus />
          </div>
        ) : !addressesAvailable ? (
          // Show contract unavailable message
          <div className="max-w-md mx-auto text-center space-y-6">
            <Alert className="border-red-500/20 bg-red-500/5">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <AlertDescription>
                ChainChaos contracts are not available on this network yet.
                <br />
                <span className="text-xs mt-2 block">Supported: TXZ (native) and USDC tokens</span>
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          // Show main betting interface
          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold">Predict. Win. Repeat.</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Join continuous 10-minute prediction rounds on blockchain metrics. 
                Predict gas prices, block heights, and more on the Etherlink network.
              </p>
            </div>

            {/* Admin Quick Actions */}
            {isOwner && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-primary">Admin Panel</h3>
                    <p className="text-sm text-muted-foreground">Manage automated betting rounds</p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => window.location.href = '/admin'} size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Admin Panel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Main Betting Interface */}
            <CurrentBet />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/20 bg-muted/5">
        <div className="container mx-auto px-4 py-8">

          {/* Bottom Section */}
          <div className="border-t border-border/20 mt-8 pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                © 2024 ChainChaos. Built with ❤️ on Etherlink.
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>v1.0.0</span>
                <span>•</span>
                <span>Decentralized</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
