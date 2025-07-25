'use client'

import React, { useState, useMemo } from 'react'
import { useActiveAccount, useActiveWalletChain } from 'thirdweb/react'
import { useReadContract } from "thirdweb/react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { BetCard } from '@/components/BetCard'
import { 
  BetInfo, 
  BetStatus,
  CurrencyType
} from '@/lib/types'
import { 
  getChainChaosContract,
  getChainChaosAddress,
  areAddressesAvailable,
  isEtherlinkChain,
  getEtherlinkChainName,
  defaultChain
} from '@/lib/thirdweb'
import { ArrowLeft, Trophy, Clock, AlertTriangle, Gift } from 'lucide-react'

interface BetHistoryProps {
  onBack?: () => void
}

export function BetHistory({ onBack }: BetHistoryProps) {
  const account = useActiveAccount()
  const activeChain = useActiveWalletChain()
  const chainId = activeChain?.id || defaultChain.id
  const [expandedBets, setExpandedBets] = useState<Set<string>>(new Set())

  const isConnected = !!account
  const chainChaosAddress = getChainChaosAddress(chainId)
  const addressesAvailable = areAddressesAvailable(chainId)
  const isEtherlink = isEtherlinkChain(chainId)
  const contract = getChainChaosContract(chainId)

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      window.location.href = '/'
    }
  }

  // Get active bets using useReadContract
  const { 
    data: activeBetIds, 
    isLoading: loadingActive 
  } = useReadContract({
    contract: contract!,
    method: 'getActiveBets',
    queryOptions: {
      enabled: !!contract && addressesAvailable,
      refetchInterval: 30 * 1000, // Refetch every 30 seconds
    },
  })

  // Get settled bets using useReadContract  
  const { 
    data: settledBetIds, 
    isLoading: loadingSettled 
  } = useReadContract({
    contract: contract!,
    method: 'getSettledBets',
    queryOptions: {
      enabled: !!contract && addressesAvailable,
      refetchInterval: 30 * 1000, // Refetch every 30 seconds
    },
  })

  // More efficient: Get players for each bet and filter client-side
  const UserBetItem = ({ betId }: { betId: bigint }) => {
    const { data: betPlayers, isLoading: loadingPlayers } = useReadContract({
      contract: contract!,
      method: 'getBetPlayers',
      params: [betId],
      queryOptions: {
        enabled: !!contract,
        refetchInterval: 60 * 1000, // Cache for 1 minute
      },
    })
    
    // Check if user participated by looking for their address in players array
    const userParticipated = useMemo(() => {
      if (!betPlayers || !account?.address) return false
      return betPlayers.some((player: string) => 
        player.toLowerCase() === account.address!.toLowerCase()
      )
    }, [betPlayers, account?.address])
    
    // Don't render if user didn't participate
    if (!userParticipated) return null
    
    return <BetItem betId={betId} />
  }

  // Helper component to fetch and display individual bet data
  const BetItem = ({ betId }: { betId: bigint }) => {
    const { data: betData, isLoading } = useReadContract({
      contract: contract!,
      method: 'getBetInfo',
      params: [betId],
      queryOptions: {
        enabled: !!contract && !!betId,
        refetchInterval: 60 * 1000, // Cache for 1 minute
      },
    })
    
    if (isLoading) {
      return <div className="h-32 bg-muted/20 rounded-lg animate-pulse" />
    }
    
    if (!betData) {
      return (
        <Alert className="border-red-500/20 bg-red-500/5">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <AlertDescription>
            Error loading bet #{betId.toString()}
          </AlertDescription>
        </Alert>
      )
    }

    // Transform contract data to BetInfo format
    const betInfo: BetInfo = {
      id: betData[0],
      category: betData[1],
      description: betData[2],
      currencyType: Number(betData[3]),
      betAmount: betData[4],
      actualValue: betData[5],
      status: Number(betData[6]),
      totalPot: betData[7],
      refundMode: betData[8],
      playerBetCount: betData[9],
      createdAt: betData[10],
      startTime: betData[11],
      endTime: betData[12],
    }

    return (
      <BetCard 
        bet={betInfo} 
        chainId={chainId}
      />
    )
  }

  // Combine all bets (active and settled)
  const allBetIds = useMemo(() => {
    const active = activeBetIds || []
    const settled = settledBetIds || []
    
    // Combine and deduplicate (in case a bet appears in both lists during transition)
    const allIds = [...active, ...settled]
    const uniqueIds = Array.from(new Set(allIds.map(id => id.toString()))).map(id => BigInt(id))
    
    // Sort by ID descending (newest first)
    return uniqueIds.sort((a, b) => Number(b - a))
  }, [activeBetIds, settledBetIds])

  // Loading state
  if (loadingActive || loadingSettled) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button onClick={handleBack} variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {onBack ? 'Back to Current Round' : 'Back to Home'}
          </Button>
        </div>
        
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Prediction History</h2>
          <p className="text-muted-foreground">Loading past rounds...</p>
        </div>
        
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-80 bg-muted/20 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // Network not supported
  if (!isEtherlink) {
    return (
      <div className="space-y-6">
        <Button onClick={handleBack} variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <Alert className="max-w-md mx-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            ChainChaos is only available on Etherlink networks.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Contract not available
  if (!addressesAvailable) {
    return (
      <div className="space-y-6">
        <Button onClick={handleBack} variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <Alert className="max-w-md mx-auto border-red-500/20 bg-red-500/5">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <AlertDescription>
            Contract not available on {getEtherlinkChainName(chainId)}.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button onClick={handleBack} variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {onBack ? 'Back to Current Round' : 'Back to Home'}
          </Button>
        </div>
        
        {/* Recent rounds alert */}
        {allBetIds && allBetIds.length > 0 && isConnected && (
          <Alert className="border-blue-500/20 bg-blue-500/5 max-w-xs">
            <Trophy className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-sm">
              <strong>{allBetIds.length}</strong> total round{allBetIds.length > 1 ? 's' : ''} 
              {settledBetIds && settledBetIds.length > 0 && (
                <span className="block text-xs opacity-75">
                  {settledBetIds.length} settled, {(activeBetIds?.length || 0)} active
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Title */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Prediction History</h2>
        <p className="text-muted-foreground">
          {allBetIds?.length || 0} total prediction rounds
          {allBetIds && allBetIds.length > 0 && (
            <span className="block text-sm">
              {activeBetIds?.length || 0} active • {settledBetIds?.length || 0} settled
            </span>
          )}
        </p>
      </div>

      {/* Content */}
      {!allBetIds || allBetIds.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto" />
          <div>
            <h3 className="text-lg font-semibold">No Past Rounds Yet</h3>
            <p className="text-muted-foreground">
              Completed prediction rounds will appear here.
            </p>
          </div>
          <Button onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {onBack ? 'Go to Current Round' : 'Go to Home'}
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="recent" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="recent" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Rounds
              <Badge variant="secondary" className="ml-1">
                {Math.min(allBetIds?.length || 0, 20)}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="rewards" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              My Rewards
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recent" className="space-y-4">
            <div className="grid gap-6 max-w-4xl mx-auto">
              {allBetIds
                ?.slice(0, 20) // Limit to 20 most recent (already sorted newest first)
                .map((betId) => (
                  <BetItem key={betId.toString()} betId={betId} />
                ))}
            </div>
          </TabsContent>

          <TabsContent value="rewards" className="space-y-4">
            {!isConnected ? (
              <div className="text-center py-16 space-y-4">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold">Connect Your Wallet</h3>
                  <p className="text-muted-foreground">
                    Connect your wallet to see rewards and claim winnings.
                  </p>
                </div>
              </div>
            ) : !settledBetIds || settledBetIds.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold">No Settled Rounds Yet</h3>
                  <p className="text-muted-foreground">
                    Participate in prediction rounds to see your rewards here when they settle.
                  </p>
                </div>
                <Button onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {onBack ? 'Join Current Round' : 'Go to Home'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert className="border-blue-500/20 bg-blue-500/5">
                  <Trophy className="h-4 w-4 text-blue-500" />
                  <AlertDescription>
                    Showing rounds you participated in. Each card shows your participation and any rewards to claim.
                  </AlertDescription>
                </Alert>
                
                <div className="grid gap-6 max-w-4xl mx-auto">
                  {/* Show recent settled bets where user participated */}
                  {settledBetIds
                    ?.slice()
                    .reverse() // Most recent first
                    .slice(0, 20) // Show last 20 settled bets (filtered to user participation)
                    .map((betId: bigint) => (
                      <UserBetItem key={`reward-${betId.toString()}`} betId={betId} />
                    ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
} 