'use client'

import { useState, useEffect } from 'react'
import { useActiveAccount, useActiveWalletChain } from 'thirdweb/react'
import { ConnectButton } from 'thirdweb/react'
import { readContract } from 'thirdweb'
import { CurrentBet } from '@/components/CurrentBet'
import { Button } from '@/components/ui/button'
import { 
  getChainChaosContract,
  supportedChains,
  defaultChain,
  getEtherlinkChainName
} from '@/lib/thirdweb'
import { client } from '@/lib/client'
import { Settings, History } from 'lucide-react'
import Link from 'next/link'
import { WinnerNotifications } from '@/components/WinnerNotifications'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

export default function Home() {
  const account = useActiveAccount()
  const activeChain = useActiveWalletChain()
  const chainId = activeChain?.id || defaultChain.id
  const [isOwner, setIsOwner] = useState(false)

  const contract = getChainChaosContract(chainId)

  // Check if user is owner
  useEffect(() => {
    async function checkOwner() {
      if (!contract || !account?.address) {
        setIsOwner(false)
        return
      }

      try {
        const owner = await readContract({
          contract,
          method: 'owner',
        })
        setIsOwner(owner.toLowerCase() === account.address.toLowerCase())
      } catch (error) {
        console.error('Error checking owner:', error)
        setIsOwner(false)
      }
    }

    checkOwner()
  }, [contract, account?.address])

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
                  {isOwner && (
                    <Link href="/admin">
                      <Button variant="ghost" size="sm" className="gap-2">
                        <Settings className="h-4 w-4" />
                        Admin
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <ConnectButton
                  client={client}
                  chains={supportedChains}
                  appMetadata={{
                    name: "ChainChaos",
                    url: "https://chainchaos.com",
                    description: "A prediction market for Ethereum gas prices on Etherlink",
                  }}
                />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 space-y-8">
          {/* Winner Notifications */}
          <WinnerNotifications />
          
          {/* Current Bet */}
          {contract ? <CurrentBet /> : 
                <Alert className="max-w-md mx-auto border-red-500/20 bg-red-500/5">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <AlertDescription>
                  Contract not available on {getEtherlinkChainName(chainId)}.
                </AlertDescription>
              </Alert>
              }
        </main>
      </div>
    </div>
  )
}
