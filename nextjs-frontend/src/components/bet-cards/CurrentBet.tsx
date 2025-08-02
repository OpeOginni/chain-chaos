'use client'

import React from 'react'
import { useActiveWalletChain, useReadContract } from 'thirdweb/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { BetCard } from '@/components/bet-cards/BetCard'
import { 
  BetInfo, 
  BetStatus
} from '@/lib/types'
import { 
  getChainChaosContract,
  areAddressesAvailable,
  isEtherlinkChain,
  getEtherlinkChainName,
  defaultChain
} from '@/lib/thirdweb'
import { Clock, History, Trophy, AlertTriangle } from 'lucide-react'

interface CurrentBetProps {
  onShowHistory?: () => void
}

export function CurrentBet({ onShowHistory }: CurrentBetProps) {
  const activeChain = useActiveWalletChain()
  const chainId = activeChain?.id || defaultChain.id

  const handleShowHistory = () => {
    if (onShowHistory) {
      onShowHistory()
    } else {
      window.location.href = '/history'
    }
  }

  const addressesAvailable = areAddressesAvailable(chainId)
  const isEtherlink = isEtherlinkChain(chainId)
  const contract = getChainChaosContract(chainId)

  // Get active bets (manual system - show most recent active bet)
  const { 
    data: activeBetIds, 
    isLoading: loadingBet, 
    isError: errorBet,
  } = useReadContract({
    contract: contract!,
    method: 'getActiveBets',
    queryOptions: {
      enabled: !!contract && addressesAvailable,
      refetchInterval: 15 * 1000, // Refetch every 15 seconds
    },
  })

  // Get the most recent active bet info
  const mostRecentBetId = activeBetIds && activeBetIds.length > 0 ? activeBetIds[activeBetIds.length - 1] : null

  const { 
    data: currentBetData,
    isLoading: loadingBetInfo 
  } = useReadContract({
    contract: contract!,
    method: 'getBetInfo',
    params: mostRecentBetId ? [mostRecentBetId] : undefined!,
    queryOptions: {
      enabled: !!contract && !!mostRecentBetId,
      refetchInterval: 15 * 1000,
    },
  })

  // Check if betting is currently active (considering 1-minute cutoff)
  const { data: isBettingActive } = useReadContract({
    contract: contract!,
    method: 'isBettingActive',
    params: mostRecentBetId ? [mostRecentBetId] : undefined!,
    queryOptions: {
      enabled: !!contract && !!mostRecentBetId,
      refetchInterval: 5 * 1000, // Check every 5 seconds
    },
  })

  // Parse current bet data
  const currentBet: BetInfo | null = currentBetData ? {
    id: currentBetData[0],
    category: currentBetData[1],
    description: currentBetData[2],
    currencyType: Number(currentBetData[3]),
    betAmount: currentBetData[4],
    actualValue: currentBetData[5],
    status: Number(currentBetData[6]),
    totalPot: currentBetData[7],
    refundMode: currentBetData[8],
    playerBetCount: currentBetData[9],
    createdAt: currentBetData[10],
    startTime: currentBetData[11],
    endTime: currentBetData[12],
  } : null

  // Loading state
  if (loadingBet || loadingBetInfo) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Current Prediction Round</h2>
          <p className="text-muted-foreground">Loading current bet...</p>
        </div>
        <div className="h-80 bg-muted/20 rounded-lg animate-pulse"></div>
      </div>
    )
  }

  // Network not supported
  if (!isEtherlink) {
    return (
      <Alert className="max-w-md mx-auto">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          ChainChaos is only available on Etherlink networks.
        </AlertDescription>
      </Alert>
    )
  }

  // Contract not available
  if (!addressesAvailable) {
    return (
      <Alert className="max-w-md mx-auto border-red-500/20 bg-red-500/5">
        <AlertTriangle className="h-4 w-4 text-red-500" />
        <AlertDescription>
          Contract not available on {getEtherlinkChainName(chainId)}.
        </AlertDescription>
      </Alert>
    )
  }

  // No active bet
  if (errorBet || !activeBetIds || activeBetIds.length === 0 || !currentBet) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Current Prediction Round</h2>
          <p className="text-muted-foreground mb-4">No active bet at the moment</p>
          
          <Alert className="max-w-md mx-auto">
            <Clock className="h-4 w-4" />
            <AlertDescription>
              The next prediction round will start soon. Check back in a few minutes!
            </AlertDescription>
          </Alert>
        </div>

        <div className="flex justify-center">
          <Button onClick={handleShowHistory} variant="outline">
            <History className="h-4 w-4 mr-2" />
            View Past Rounds
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with countdown */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <h2 className="text-2xl font-bold">Current Prediction Round</h2>
          <Badge variant="secondary">#{currentBet.id.toString()}</Badge>
        </div>
        
        {/* Betting Status */}
        {currentBet.status === BetStatus.ACTIVE && (
          <div className="flex items-center justify-center">
            {isBettingActive ? (
              <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                <Clock className="h-3 w-3 mr-1" />
                Betting Open
              </Badge>
            ) : (
              <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
                <Clock className="h-3 w-3 mr-1" />
                Betting Closed (1min cutoff)
              </Badge>
            )}
          </div>
        )}

        {/* Settled status */}
        {currentBet.status === BetStatus.SETTLED && (
          <div className="flex items-center justify-center">
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
              <Trophy className="h-3 w-3 mr-1" />
              Round Complete
            </Badge>
          </div>
        )}
      </div>

      {/* Current Bet Card */}
      <div className="max-w-2xl mx-auto">
        <BetCard 
          bet={currentBet}
          chainId={chainId}
        />
      </div>

      {/* Navigation */}
      <div className="flex justify-center">
        <Button onClick={handleShowHistory} variant="outline">
          <History className="h-4 w-4 mr-2" />
          View Past Rounds
        </Button>
      </div>
    </div>
  )
} 