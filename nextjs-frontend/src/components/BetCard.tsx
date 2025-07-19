'use client'

import { useRef, useEffect, useState } from 'react'
import { useActiveAccount, useSendTransaction, useActiveWalletChain, useWaitForReceipt, useReadContract } from 'thirdweb/react'
import { ConnectButton } from 'thirdweb/react'
import { readContract, prepareContractCall } from 'thirdweb'
import { toWei } from 'thirdweb/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Bet,
  BetInfo, 
  CurrencyType, 
  BetStatus
} from '@/lib/types'
import { 
  getChainChaosContract,
  getUSDCContract,
  getChainChaosAddress,
  getUSDCAddress,
  areAddressesAvailable,
  isEtherlinkChain,
  defaultChain,
  etherlinkMainnet,
  etherlinkTestnet
} from '@/lib/thirdweb'
import { client } from '@/lib/client'
import { formatEther, formatUSDC, formatBetCategory, formatTimestamp, formatCountdown, formatActualValue, getCategoryUnit, isGasCategory } from '@/lib/utils'
import { fetchBaselineData, formatBetCategoryName, getPredictionHint } from '@/lib/baseline-data'
import { TokenIcon, getTokenSymbol } from '@/components/ui/TokenIcon'
import { AutomationDetails } from '@/components/AutomationDetails'
import { Clock, Users, DollarSign, TrendingUp, Loader2, CheckCircle, Trophy, Gift, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface BetCardProps {
  bet: BetInfo | Bet
  chainId?: number
}

export function BetCard({ bet, chainId: propChainId }: BetCardProps) {
  const account = useActiveAccount()
  const activeChain = useActiveWalletChain()
  const chainId = propChainId || activeChain?.id || defaultChain.id
  const guessRef = useRef<HTMLInputElement>(null)
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [betInfo, setBetInfo] = useState<BetInfo | null>(null)
  const [transactionHash, setTransactionHash] = useState<string | null>(null)
  const [baselineData, setBaselineData] = useState<{
    value: string
    unit: string
    label: string
  } | null>(null)
  const [loadingBaseline, setLoadingBaseline] = useState(false)
  
  // Track transaction type
  const lastTransactionRef = useRef<{ type: 'bet' | 'approve' | 'claim' | null }>({ type: null })
  
  const { mutate: sendTransaction, data: transactionResult } = useSendTransaction()

  // Wait for transaction receipt
  const { data: receipt, isLoading: isConfirming } = useWaitForReceipt({
    client,
    chain: chainId === etherlinkMainnet.id ? etherlinkMainnet : etherlinkTestnet,
    transactionHash: (transactionHash && transactionHash.startsWith('0x')) ? transactionHash as `0x${string}` : "0x0000000000000000000000000000000000000000000000000000000000000000",
    queryOptions: {
      enabled: !!(transactionHash && transactionHash.startsWith('0x')),
    }
  })

  const chainChaosAddress = getChainChaosAddress(chainId)
  const usdcAddress = getUSDCAddress(chainId)
  const addressesAvailable = areAddressesAvailable(chainId)
  const isEtherlink = isEtherlinkChain(chainId)
  const isConnected = !!account

  // Get contract instances
  const chainChaosContract = getChainChaosContract(chainId)
  const usdcContract = getUSDCContract(chainId)

  // If bet is simplified, fetch full bet info
  useEffect(() => {
    async function fetchBetInfo() {
      if ('currencyType' in bet) {
        // Already have full BetInfo
        setBetInfo(bet as BetInfo)
        return
      }

      if (!chainChaosContract) return

      setIsLoading(true)
      try {
        const fullBetData = await readContract({
          contract: chainChaosContract,
          method: "getBetInfo",
          params: [BigInt(bet.id)]
        })

        const betData = fullBetData as readonly [bigint, string, string, number, bigint, bigint, number, bigint, boolean, bigint, bigint, bigint, bigint]

        setBetInfo({
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
        })
      } catch (error) {
        console.error('Error fetching bet info:', error)
        toast.error('Failed to load bet details')
      } finally {
        setIsLoading(false)
      }
    }

    fetchBetInfo()
  }, [bet, chainChaosContract])

  // Check if betting is currently active (considering 1-minute cutoff)
  const { data: isBettingActive } = useReadContract({
    contract: chainChaosContract!,
    method: "isBettingActive",
    params: betInfo ? [betInfo.id] : undefined!,
    queryOptions: {
      enabled: !!(betInfo?.status === BetStatus.ACTIVE && chainChaosContract),
      refetchInterval: 10 * 1000, // Check every 10 seconds
    },
  })

  // Check USDC allowance for USDC bets
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    contract: usdcContract!,
    method: "allowance",
    params: account && chainChaosAddress ? [account.address, chainChaosAddress as string] : undefined!,
    queryOptions: {
      enabled: !!(betInfo?.currencyType === CurrencyType.USDC && account && chainChaosAddress && usdcContract),
    },
  })

  // Get winner indices for settled bets
  const { data: winnerIndices } = useReadContract({
    contract: chainChaosContract!,
    method: "getBetWinnerIndices",
    params: betInfo ? [betInfo.id] : undefined!,
    queryOptions: {
      enabled: !!(betInfo?.status === BetStatus.SETTLED && chainChaosContract),
    },
  })

  // Check if user participated in this bet
  const { data: userParticipated } = useReadContract({
    contract: chainChaosContract!,
    method: "hasPlayerBet",
    params: betInfo && account ? [betInfo.id, account.address] : undefined!,
    queryOptions: {
      enabled: !!((betInfo?.status === BetStatus.SETTLED || betInfo?.status === BetStatus.CANCELLED) && account && chainChaosContract),
    },
  })

  // Computed values
  const needsApproval = betInfo?.currencyType === CurrencyType.USDC && 
    allowance !== undefined && (allowance as unknown as bigint) < betInfo.betAmount
  
  const isClaiming = lastTransactionRef.current.type === 'claim'
  const isPlacingBet = lastTransactionRef.current.type === 'bet' || lastTransactionRef.current.type === 'approve'
  const isPending = !!transactionHash && !receipt

  // Timer effect
  useEffect(() => {
    if (!betInfo || betInfo.status !== BetStatus.ACTIVE || !betInfo.endTime || Number(betInfo.endTime) === 0) {
      setTimeLeft('')
      return
    }
    
    const endTime = Number(betInfo.endTime)
    
    const intervalId = setInterval(() => {
      const now = Math.floor(Date.now() / 1000)
      const remaining = endTime - now

      if (remaining > 0) {
        setTimeLeft(formatCountdown(remaining))
      } else {
        setTimeLeft('00:00')
        clearInterval(intervalId)
      }
    }, 1000)

    // Set initial value
    const now = Math.floor(Date.now() / 1000)
    const remaining = endTime - now
    if (remaining > 0) {
      setTimeLeft(formatCountdown(remaining))
    } else {
      setTimeLeft('00:00')
    }

    return () => clearInterval(intervalId)
  }, [betInfo])

  // Fetch baseline data for active bets
  useEffect(() => {
    if (betInfo?.status === BetStatus.ACTIVE) {
      setLoadingBaseline(true)
      fetchBaselineData(betInfo.category, chainId)
        .then(setBaselineData)
        .catch(error => {
          console.error('Failed to fetch baseline data:', error)
          setBaselineData(null)
        })
        .finally(() => setLoadingBaseline(false))
    }
  }, [betInfo?.category, betInfo?.status, chainId])

  // Handle transaction success
  useEffect(() => {
    if (receipt) {
      const transactionType = lastTransactionRef.current.type
      
      if (transactionType === 'claim') {
        toast.success('Prize claimed successfully!', {
          description: 'Your winnings have been transferred to your wallet.'
        })
        
        // Remove winner notification from Redis
        if (account?.address && betInfo) {
          fetch(`/api/notifications?address=${account.address}&betId=${betInfo.id}`, {
            method: 'DELETE'
          }).catch(error => {
            console.error('Failed to remove notification:', error)
          })
        }
      } else if (transactionType === 'approve') {
        toast.success('USDC spending approved!', {
          description: 'You can now place your bet.'
        })
        refetchAllowance()
      } else if (transactionType === 'bet') {
        toast.success('Bet placed successfully!', {
          description: 'Your prediction has been recorded.'
        })
        // Clear the input
        if (guessRef.current) {
          guessRef.current.value = ''
        }
      }
      
      // Reset transaction tracking
      lastTransactionRef.current.type = null
      setTransactionHash(null)
    }
  }, [receipt, refetchAllowance, account?.address, betInfo])

  const loading = isPending || isConfirming

  const handleApproveUSDC = async () => {
    if (!usdcContract || !chainChaosAddress || !account) {
      toast.error('Contract addresses not available')
      return
    }

    try {
      lastTransactionRef.current.type = 'approve'
      
      // Approve a large amount (max uint256 for convenience)
      const maxApproval = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
      
      const approveTransaction = prepareContractCall({
        contract: usdcContract,
        method: "function approve(address spender, uint256 amount) returns (bool)",
        params: [chainChaosAddress as string, maxApproval]
      })

      sendTransaction(approveTransaction as any, {
        onSuccess: (result) => {
          setTransactionHash(result.transactionHash)
        },
        onError: (error) => {
          toast.error('Failed to approve USDC spending')
          console.error(error)
          lastTransactionRef.current.type = null
        }
      })
    } catch (error) {
      toast.error('Failed to approve USDC spending')
      console.error(error)
      lastTransactionRef.current.type = null
    }
  }

  const handlePlaceBet = async () => {
    const guess = guessRef.current?.value || ''
    
    if (!guess || !isConnected || !account || !chainChaosAddress) {
      toast.error('Please connect wallet and enter a guess')
      return
    }

    if (!addressesAvailable) {
      toast.error('Contract addresses not available for this network')
      return
    }

    if (betInfo?.currencyType === CurrencyType.USDC && needsApproval) {
      toast.error('Please approve USDC spending first')
      return
    }

    if (!betInfo) return

    const guessFloat = parseFloat(guess)
    const guessValue: bigint = BigInt(Math.floor(guessFloat))
    
    try {
      lastTransactionRef.current.type = 'bet'
      
      const transaction = prepareContractCall({
        contract: chainChaosContract!,
        method: "placeBet",
        params: [betInfo.id, guessValue],
        value: betInfo.currencyType === CurrencyType.XTZ ? betInfo.betAmount : BigInt(0)
      })

      sendTransaction(transaction as any, {
        onSuccess: (result) => {
          setTransactionHash(result.transactionHash)
        },
        onError: (error: any) => {
          console.error('Error placing bet:', error)
          
          // Handle specific error cases
          if (error?.message?.includes('BettingCutoffPeriod')) {
            toast.error('Betting is closed - less than 2 minutes until round ends')
          } else if (error?.message?.includes('PlayerAlreadyBet')) {
            toast.error('You have already placed a bet on this round')
          } else if (error?.message?.includes('BetNotActive')) {
            toast.error('This betting round is no longer active')
          } else {
            toast.error('Failed to place bet')
          }
          lastTransactionRef.current.type = null
        }
      })
    } catch (error: any) {
      console.error('Error placing bet:', error)
      toast.error('Failed to place bet')
      lastTransactionRef.current.type = null
    }
  }

  const handleClaimPrize = async () => {
    if (!chainChaosContract || !account) {
      toast.error('Unable to claim prize')
      return
    }

    if (!addressesAvailable) {
      toast.error('Contract addresses not available for this network')
      return
    }

    if (!betInfo) return

    try {
      lastTransactionRef.current.type = 'claim'
      
      const claimTransaction = prepareContractCall({
        contract: chainChaosContract,
        method: "claimPrize",
        params: [betInfo.id]
      })

      sendTransaction(claimTransaction as any, {
        onSuccess: (result) => {
          setTransactionHash(result.transactionHash)
        },
        onError: (error: any) => {
          console.error('Error claiming prize:', error)
          
          // Handle specific error cases
          if (error?.message?.includes('NotWinnerOrAlreadyClaimed')) {
            toast.error('You did not win this round or already claimed your prize')
          } else if (error?.message?.includes('NoRefundAvailable')) {
            toast.error('No refund available for this bet')
          } else {
            toast.error('Failed to claim prize. You may not have won this round.')
          }
          
          lastTransactionRef.current.type = null
        }
      })
    } catch (error: any) {
      console.error('Error claiming prize:', error)
      toast.error('Failed to claim prize')
      lastTransactionRef.current.type = null
    }
  }

  const getStatusColor = (status: BetStatus) => {
    switch (status) {
      case BetStatus.ACTIVE:
        return 'bg-primary/20 text-primary'
      case BetStatus.SETTLED:
        return 'bg-blue-500/20 text-blue-400'
      case BetStatus.CANCELLED:
        return 'bg-red-500/20 text-red-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  const formatAmount = (amount: bigint, currencyType: CurrencyType) => {
    return currencyType === CurrencyType.XTZ 
      ? formatEther(amount)
      : formatUSDC(amount)
  }

  if (isLoading && !betInfo) {
    return (
      <Card className="bet-card animate-pulse">
        <CardHeader className="pb-3">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-6 bg-muted rounded w-full"></div>
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-muted rounded"></div>
        </CardContent>
      </Card>
    )
  }

  if (!betInfo) {
    return (
      <Card className="bet-card border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Failed to load bet information
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!chainChaosAddress || !addressesAvailable) {
    return (
      <Card className="bet-card opacity-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">
              {formatBetCategory(betInfo.category)}
            </Badge>
            <Badge variant="destructive" className="text-xs">
              Unavailable
            </Badge>
          </div>
          <CardTitle className="text-lg line-clamp-2">{betInfo.description}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">Contract not available on this network</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bet-card hover:shadow-lg transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-xs">
            {formatBetCategory(betInfo.category)}
          </Badge>
          <Badge className={`text-xs ${getStatusColor(betInfo.status)}`}>
            {betInfo.status === BetStatus.ACTIVE ? 'Active' :
             betInfo.status === BetStatus.SETTLED ? 'Settled' : 'Cancelled'}
          </Badge>
        </div>
        <CardTitle className="text-lg line-clamp-2">{betInfo.description}</CardTitle>
        <CardDescription className="flex items-center gap-1 text-xs">
          <Clock className="h-3 w-3" />
          Created {formatTimestamp(Number(betInfo.createdAt))}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Automation Details */}
        <AutomationDetails 
          betId={betInfo.id} 
          chainId={chainId} 
          isSettled={betInfo.status === BetStatus.SETTLED} 
        />

        {/* Bet Details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bet-stat">
            <div className="flex items-center gap-1 text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              Bet Amount
            </div>
            <div className="font-semibold flex items-center gap-1">
              <TokenIcon currencyType={betInfo.currencyType} size={14} />
              {formatAmount(betInfo.betAmount, betInfo.currencyType)}
              <span className="text-xs text-muted-foreground">
                {getTokenSymbol(betInfo.currencyType)}
              </span>
            </div>
          </div>

          <div className="bet-stat">
            <div className="flex items-center gap-1 text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              {betInfo.status === BetStatus.SETTLED ? 'Prize Pool' : 'Total Pot'}
            </div>
            <div className="font-semibold flex items-center gap-1">
              <TokenIcon currencyType={betInfo.currencyType} size={14} />
              {betInfo.status === BetStatus.SETTLED 
                ? formatAmount(betInfo.totalPot - (betInfo.totalPot * BigInt(5)) / BigInt(100), betInfo.currencyType)
                : formatAmount(betInfo.totalPot, betInfo.currencyType)
              }
              <span className="text-xs text-muted-foreground">
                {getTokenSymbol(betInfo.currencyType)}
              </span>
            </div>
            {betInfo.status === BetStatus.SETTLED && (
              <div className="text-xs text-muted-foreground">
                Total: {formatAmount(betInfo.totalPot, betInfo.currencyType)} {getTokenSymbol(betInfo.currencyType)} (5% fee)
              </div>
            )}
          </div>

          <div className="bet-stat">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="h-3 w-3" />
              Players
            </div>
            <div className="font-semibold">{betInfo.playerBetCount.toString()}</div>
          </div>

          {timeLeft && betInfo.status === BetStatus.ACTIVE && (
            <div className="bet-stat">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                Time Left
              </div>
              <div className="font-semibold text-primary">{timeLeft}</div>
            </div>
          )}

                     {betInfo.status === BetStatus.SETTLED && (
             <div className="bet-stat">
               <div className="text-muted-foreground">Actual Value</div>
               <div className="font-semibold text-blue-400">{formatActualValue(betInfo.actualValue)}</div>
             </div>
           )}
        </div>

        {/* Betting Interface */}
        {betInfo.status === BetStatus.ACTIVE && isConnected && (
          <>
            <Separator />
            <div className="space-y-4">
              {/* Baseline Information */}
              {baselineData && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      {baselineData.label}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      Baseline
                    </Badge>
                  </div>
                  <div className="text-lg font-bold text-primary">
                    {baselineData.value} {baselineData.unit}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {getPredictionHint(betInfo.category)}
                  </p>
                </div>
              )}
              
              {loadingBaseline && (
                <div className="bg-muted/30 rounded-lg p-3 animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-6 bg-muted rounded w-1/2"></div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="guess" className="text-sm font-medium">
                  Your Prediction
                  {baselineData && (
                    <span className="text-muted-foreground font-normal ml-1">
                      (Current: {baselineData.value} {baselineData.unit})
                    </span>
                  )}
                </Label>
                <Input
                  ref={guessRef}
                  id="guess"
                  type="number"
                  step={isGasCategory(betInfo.category) ? "1" : "1"}
                  placeholder={`Enter your prediction${baselineData ? ` (${baselineData.unit})` : ''}...`}
                  className="w-full"
                />
                {isGasCategory(betInfo.category) && (
                  <p className="text-xs text-muted-foreground">
                    💡 Gas values are in wei. Large numbers are expected (e.g., 1000000000 for 1 Gwei).
                  </p>
                )}
              </div>
              
              {/* USDC Approval Flow */}
              {betInfo.currencyType === CurrencyType.USDC && needsApproval ? (
                <Button 
                  onClick={handleApproveUSDC}
                  disabled={loading || isPlacingBet || !isBettingActive}
                  className="w-full"
                  variant="outline"
                >
                  {loading || isPlacingBet ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isConfirming ? 'Confirming...' : 'Approving...'}
                    </>
                  ) : !isBettingActive ? (
                    <>
                      <Clock className="h-4 w-4 mr-2" />
                      Betting Closed (1min cutoff)
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve USDC Spending
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={handlePlaceBet}
                  disabled={loading || isPlacingBet || !isBettingActive}
                  className="w-full"
                >
                  {loading || isPlacingBet ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isConfirming ? 'Confirming...' : 'Placing Bet...'}
                    </>
                  ) : !isBettingActive ? (
                    <>
                      <Clock className="h-4 w-4 mr-2" />
                      Betting Closed (1min cutoff)
                    </>
                  ) : (
                    <>
                      Place Bet ({formatAmount(betInfo.betAmount, betInfo.currencyType)} {getTokenSymbol(betInfo.currencyType)})
                    </>
                  )}
                </Button>
              )}
            </div>
          </>
        )}

        {/* Status Messages */}
        {betInfo.status === BetStatus.ACTIVE && !isConnected && (
          <div className="text-center py-2">
            <ConnectButton
              client={client}
              chains={[etherlinkMainnet, etherlinkTestnet]}
              appMetadata={{
                name: "ChainChaos",
                url: "https://chainchaos.com",
              }}
            />
          </div>
        )}

        {betInfo.status === BetStatus.CANCELLED && betInfo.refundMode && !isConnected && (
          <div className="text-center py-2 space-y-2">
            <Badge variant="outline" className="text-yellow-500 border-yellow-500">
              Refunds Available
            </Badge>
            <p className="text-xs text-muted-foreground">Connect wallet to claim refund</p>
          </div>
        )}

        {betInfo.status === BetStatus.CANCELLED && betInfo.refundMode && isConnected && userParticipated && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-amber-500">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Refund Available</span>
              </div>
              <p className="text-xs text-muted-foreground">
                This bet was cancelled or had insufficient participants. You can claim your refund.
              </p>
              <Button 
                onClick={handleClaimPrize}
                disabled={loading || isClaiming}
                className="w-full"
                variant="outline"
              >
                {loading || isClaiming ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isConfirming ? 'Confirming...' : 'Claiming...'}
                  </>
                ) : (
                  <>
                    <Gift className="h-4 w-4 mr-2" />
                    Claim Refund ({formatAmount(betInfo.betAmount, betInfo.currencyType)} {getTokenSymbol(betInfo.currencyType)})
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Claiming Interface for Settled Bets */}
        {betInfo.status === BetStatus.SETTLED && !isConnected && (
          <div className="text-center py-2 space-y-2">
            <p className="text-sm text-muted-foreground">Connect wallet to check for winnings</p>
          </div>
        )}

        {betInfo.status === BetStatus.SETTLED && isConnected && userParticipated && !betInfo.refundMode && (
          <>
            <Separator />
            <div className="space-y-3">
              { winnerIndices && (winnerIndices as bigint[]).length > 0 ? (
                <div className="space-y-3">
                                     <div className="text-xs text-muted-foreground space-y-1">
                     <p>Actual result: <span className="font-semibold text-blue-400">{formatActualValue(betInfo.actualValue)}</span></p>
                     <p>{(winnerIndices as bigint[]).length} winner{(winnerIndices as bigint[]).length > 1 ? 's' : ''} found</p>
                   </div>
                  
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center space-y-2">
                    <Trophy className="h-6 w-6 mx-auto text-blue-500" />
                    <p className="text-sm font-medium">Round Complete</p>
                                         <p className="text-xs text-muted-foreground">
                       If your guess was closest to {formatActualValue(betInfo.actualValue)}, you can claim your prize
                     </p>
                  </div>
                  
                  <Button 
                    onClick={handleClaimPrize}
                    disabled={loading || isClaiming}
                    className="w-full"
                    variant="outline"
                  >
                    {loading || isClaiming ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {isConfirming ? 'Confirming...' : 'Claiming...'}
                      </>
                    ) : (
                      <>
                        <Trophy className="h-4 w-4 mr-2" />
                        Try to Claim Prize
                      </>
                    )}
                  </Button>
                  
                  <p className="text-xs text-muted-foreground text-center">
                    ⚠️ Only winners can successfully claim. Transaction will revert if you didn't win.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                   <div className="text-xs text-muted-foreground space-y-1">
                     <p>Actual result: <span className="font-semibold text-blue-400">{formatActualValue(betInfo.actualValue)}</span></p>
                     <p>No winners found</p>
                   </div>
                   
                   <div className="text-center py-3">
                     <Badge variant="outline" className="text-muted-foreground">
                       No winners in this round
                     </Badge>
                   </div>
                 </div>
               )}
            </div>
          </>
        )}

        {/* Show settled status for non-participants */}
        {betInfo.status === BetStatus.SETTLED && isConnected && !userParticipated && (
          <>
            <Separator />
            <div className="text-center py-3 space-y-2">
              <div className="text-xs text-muted-foreground">
                <p>Actual result: <span className="font-semibold text-blue-400">{formatActualValue(betInfo.actualValue)}</span></p>
                {winnerIndices && (winnerIndices as bigint[]).length > 0 && (
                  <p>{(winnerIndices as bigint[]).length} winner{(winnerIndices as bigint[]).length > 1 ? 's' : ''} found</p>
                )}
              </div>
              <Badge variant="outline" className="text-muted-foreground">
                You didn't participate in this round
              </Badge>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
} 