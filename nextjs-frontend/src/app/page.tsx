'use client'

import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useChainId } from 'wagmi'
import { WalletConnection } from '@/components/WalletConnection'
import { BetCard } from '@/components/BetCard'
import { CreateBetDialog } from '@/components/CreateBetDialog'
import { SupportedTokens } from '@/components/SupportedTokens'
import { NetworkStatus } from '@/components/NetworkStatus'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { EtherlinkLogo, EtherlinkIcon } from '@/components/ui/EtherlinkLogo'
import { ChainChaosABI } from '@/blockchain/ChainChaosABI'
import { 
  BetInfo, 
  getChainChaosAddress,
  areAddressesAvailable,
  isEtherlinkChain 
} from '@/lib/wagmi'
import { Gamepad2, Plus, TrendingUp, Clock, Users, Settings, AlertTriangle } from 'lucide-react'

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

  // Read active bets
  const { data: activeBetIds, isLoading: loadingActive, refetch: refetchActive } = useReadContract({
    address: chainChaosAddress,
    abi: ChainChaosABI,
    functionName: 'getActiveBets',
    query: {
      enabled: contractCallsEnabled,
    },
  })

  // Read settled bets
  const { data: settledBetIds, isLoading: loadingSettled, refetch: refetchSettled } = useReadContract({
    address: chainChaosAddress,
    abi: ChainChaosABI,
    functionName: 'getSettledBets',
    query: {
      enabled: contractCallsEnabled,
    },
  })

  // Check if user is owner
  useEffect(() => {
    if (owner && address) {
      setIsOwner(owner.toLowerCase() === address.toLowerCase())
    }
  }, [owner, address])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/95 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3">
                <Gamepad2 className="h-8 w-8 text-primary animate-pulse-green" />
                <h1 className="text-2xl font-bold gradient-text">ChainChaos</h1>
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">on</span>
                  <EtherlinkLogo size={20} />
                </div>
              </div>
              <Badge variant="secondary" className="hidden md:inline-flex items-center gap-1">
                <EtherlinkIcon size={14} />
                Etherlink Betting
              </Badge>
            </div>
            
            <div className="flex items-center gap-3">
              {isOwner && addressesAvailable && (
                <>
                  <CreateBetDialog onBetCreated={() => {
                    refetchActive()
                    refetchSettled()
                  }}>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Create Bet
                    </Button>
                  </CreateBetDialog>
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2"
                    onClick={() => window.location.href = '/admin'}
                  >
                    <Settings className="h-4 w-4" />
                    Admin Panel
                  </Button>
                </>
              )}
              <WalletConnection />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3">
                <Gamepad2 className="h-16 w-16 text-primary animate-pulse-green" />
                <EtherlinkLogo size={64} />
              </div>
              <h2 className="text-4xl font-bold gradient-text">Welcome to ChainChaos</h2>
              <p className="text-xl text-muted-foreground max-w-md">
                Make predictions on Etherlink blockchain metrics and win rewards
              </p>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-center">Supported Tokens</h3>
              <SupportedTokens />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <NetworkStatus />
            
            {/* Show service unavailable if not on Etherlink or addresses missing */}
            {(!isEtherlink || !addressesAvailable) ? (
              <Alert className="border-yellow-500/20 bg-yellow-500/5">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-center py-8">
                  <div className="space-y-4">
                    <div className="text-lg font-semibold">Service Not Available</div>
                    <p className="text-muted-foreground">
                      {!isEtherlink 
                        ? 'Please connect to an Etherlink network to use ChainChaos.'
                        : 'Contract addresses are not configured for this network.'
                      }
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold">Etherlink Prediction Markets</h2>
                    <p className="text-muted-foreground">Make predictions on Etherlink blockchain metrics</p>
                  </div>
                  {isOwner && (
                    <Badge variant="outline" className="text-primary border-primary">
                      Contract Owner
                    </Badge>
                  )}
                </div>

                <Tabs defaultValue="active" className="space-y-6">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="active" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Active Bets
                      {activeBetIds && (
                        <Badge variant="secondary" className="ml-1">
                          {activeBetIds.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="settled" className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Settled Bets
                      {settledBetIds && (
                        <Badge variant="secondary" className="ml-1">
                          {settledBetIds.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="active" className="space-y-6">
                    {loadingActive ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <Skeleton key={i} className="h-64 w-full" />
                        ))}
                      </div>
                    ) : activeBetIds && activeBetIds.length > 0 ? (
                      <BetsList betIds={activeBetIds} userAddress={address} chainId={chainId} />
                    ) : (
                      <div className="text-center py-16 space-y-4">
                        <Clock className="h-12 w-12 text-muted-foreground mx-auto" />
                        <div>
                          <h3 className="text-lg font-semibold">No Active Bets</h3>
                          <p className="text-muted-foreground">There are no active betting markets at the moment.</p>
                        </div>
                        {isOwner && (
                          <CreateBetDialog onBetCreated={() => {
                            refetchActive()
                            refetchSettled()
                          }}>
                            <Button className="mt-4">
                              <Plus className="h-4 w-4 mr-2" />
                              Create First Bet
                            </Button>
                          </CreateBetDialog>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="settled" className="space-y-6">
                    {loadingSettled ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <Skeleton key={i} className="h-64 w-full" />
                        ))}
                      </div>
                    ) : settledBetIds && settledBetIds.length > 0 ? (
                      <BetsList betIds={settledBetIds} userAddress={address} chainId={chainId} />
                    ) : (
                      <div className="text-center py-16 space-y-4">
                        <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto" />
                        <div>
                          <h3 className="text-lg font-semibold">No Settled Bets</h3>
                          <p className="text-muted-foreground">No betting markets have been settled yet.</p>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-background/95 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <EtherlinkIcon size={16} />
              ChainChaos - Prediction Markets on Etherlink
            </div>
            <div className="text-sm text-muted-foreground">
              Built with ❤️ on Etherlink
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Component for rendering a list of bets
function BetsList({ betIds, userAddress, chainId }: { 
  betIds: readonly bigint[], 
  userAddress?: string,
  chainId: number 
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {betIds.map((betId) => (
        <BetWrapper 
          key={betId.toString()} 
          betId={betId} 
          userAddress={userAddress} 
          chainId={chainId}
        />
      ))}
    </div>
  )
}

// Wrapper component for individual bet cards
function BetWrapper({ 
  betId, 
  userAddress, 
  chainId 
}: { 
  betId: bigint, 
  userAddress?: string,
  chainId: number 
}) {
  const chainChaosAddress = getChainChaosAddress(chainId)

  const { data: betInfo, isLoading } = useReadContract({
    address: chainChaosAddress,
    abi: ChainChaosABI,
    functionName: 'getBetInfo',
    args: [betId],
    query: {
      enabled: !!chainChaosAddress,
    },
  })

  const { data: hasUserBet } = useReadContract({
    address: chainChaosAddress,
    abi: ChainChaosABI,
    functionName: 'hasPlayerBet',
    args: [betId, userAddress as `0x${string}` || '0x0000000000000000000000000000000000000000'],
    query: {
      enabled: !!userAddress && !!chainChaosAddress,
    },
  })

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />
  }

  if (!betInfo || !chainChaosAddress) {
    return null
  }

  const bet: BetInfo & { hasUserBet?: boolean } = {
    id: betInfo[0],
    category: betInfo[1],
    description: betInfo[2],
    currencyType: betInfo[3],
    betAmount: betInfo[4],
    actualValue: betInfo[5],
    status: betInfo[6],
    totalPot: betInfo[7],
    refundMode: betInfo[8],
    playerBetCount: betInfo[9],
    createdAt: betInfo[10],
    hasUserBet: hasUserBet || false,
  }

  return <BetCard bet={bet} chainId={chainId} />
}
