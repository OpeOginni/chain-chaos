"use client"

import { ConnectButton, useActiveAccount, useActiveWalletChain, useSwitchActiveWalletChain } from 'thirdweb/react'
import Link from 'next/link'
import { Button } from './ui/button'
import { HistoryIcon, Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { defaultChain, getChainChaosContract, supportedChains } from '@/lib/thirdweb'
import { readContract } from 'thirdweb'
import { client } from '@/lib/client'

export default function Header() {
    const account = useActiveAccount()
    const activeChain = useActiveWalletChain()
    const switchChain = useSwitchActiveWalletChain()
    const chainId = activeChain?.id || defaultChain.id

    const contract = getChainChaosContract(chainId)

    const [isOwner, setIsOwner] = useState(false)

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
                    <HistoryIcon className="h-4 w-4" />
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


    )
}