'use client'

import { useRef, useEffect, useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { parseEther, parseUnits } from 'viem'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ChainChaosABI } from '@/blockchain/ChainChaosABI'
import { ERC20ABI } from '@/lib/ERC20ABI'
import { 
  BetInfo, 
  CurrencyType, 
  BetStatus,
  getChainChaosAddress,
  getUSDCAddress,
  areAddressesAvailable 
} from '@/lib/wagmi'
import { formatEther, formatUSDC, formatBetCategory, formatTimestamp, formatCountdown } from '@/lib/utils'
import { fetchBaselineData, formatBetCategoryName, getPredictionHint } from '@/lib/baseline-data'
import { TokenIcon, getTokenSymbol } from '@/components/ui/TokenIcon'
import { Clock, Users, DollarSign, TrendingUp, Loader2, CheckCircle, Trophy, Gift, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface BetCardProps {
  bet: BetInfo & { hasUserBet?: boolean }
  chainId: number
}

export function BetCard({ bet, chainId }: BetCardProps) {
  const { address, isConnected } = useAccount()
  const guessRef = useRef<HTMLInputElement>(null)
  const [baselineData, setBaselineData] = useState<{
    value: string
    unit: string
    label: string
  } | null>(null)
  const [loadingBaseline, setLoadingBaseline] = useState(false)
  const [timeLeft, setTimeLeft] = useState<string>('');
  
  // Track transaction type through the writeContract args
  const lastTransactionRef = useRef<{ type: 'bet' | 'approve' | 'claim' | null }>({ type: null })

  const chainChaosAddress = getChainChaosAddress(chainId)
  const usdcAddress = getUSDCAddress(chainId)
  const addressesAvailable = areAddressesAvailable(chainId)

  // Check if betting is currently active (considering 1-minute cutoff)
  const { data: isBettingActive } = useReadContract({
    address: chainChaosAddress,
    abi: ChainChaosABI,
    functionName: 'isBettingActive',
    args: [bet.id],
    query: {
      enabled: !!(bet.status === 0 && chainChaosAddress), // Only check for active bets
      refetchInterval: 10 * 1000, // Check every 10 seconds
    },
  })

  const { writeContract, data: hash, isPending, reset } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  // Check USDC allowance for USDC bets
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: usdcAddress,
    abi: ERC20ABI,
    functionName: 'allowance',
    args: [address as `0x${string}`, chainChaosAddress as `0x${string}`],
    query: {
      enabled: !!(bet.currencyType === CurrencyType.USDC && address && chainChaosAddress && usdcAddress),
    },
  })

  // Get winner indices for settled bets
  const { data: winnerIndices } = useReadContract({
    address: chainChaosAddress,
    abi: ChainChaosABI,
    functionName: 'getBetWinnerIndices',
    args: [bet.id],
    query: {
      enabled: !!(bet.status === BetStatus.SETTLED && chainChaosAddress),
    },
  })

  // Check if user participated in this bet
  const { data: userParticipated } = useReadContract({
    address: chainChaosAddress,
    abi: ChainChaosABI,
    functionName: 'hasPlayerBet',
    args: [bet.id, address as `0x${string}` || '0x0000000000000000000000000000000000000000'],
    query: {
      enabled: !!(bet.status === BetStatus.SETTLED && address && chainChaosAddress),
    },
  })

  // Calculate user's prize info for settled bets
  const calculateUserPrizeInfo = () => {
    if (bet.status !== BetStatus.SETTLED || !winnerIndices || !address) {
      return { isWinner: false, prizeAmount: BigInt(0), userWinningBets: 0 }
    }

    // For now, we'll need to implement this check in the frontend
    // In a more advanced version, we could add a contract function to check this
    return { isWinner: false, prizeAmount: BigInt(0), userWinningBets: 0 }
  }

  const prizeInfo = calculateUserPrizeInfo()

  // Computed values instead of state
  const needsApproval = bet.currencyType === CurrencyType.USDC && 
    allowance !== undefined && allowance < bet.betAmount
  
  const isClaiming = lastTransactionRef.current.type === 'claim'
  const isPlacingBet = lastTransactionRef.current.type === 'bet' || lastTransactionRef.current.type === 'approve'

  // Timer effect
  useEffect(() => {
    if (bet.status !== BetStatus.ACTIVE || !bet.endTime || Number(bet.endTime) === 0) {
      setTimeLeft('');
      return;
    }
    
    const endTime = Number(bet.endTime);
    
    const intervalId = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = endTime - now;

      if (remaining > 0) {
        setTimeLeft(formatCountdown(remaining));
      } else {
        setTimeLeft('00:00');
        clearInterval(intervalId);
      }
    }, 1000);

    // Set initial value
    const now = Math.floor(Date.now() / 1000);
    const remaining = endTime - now;
    if (remaining > 0) {
      setTimeLeft(formatCountdown(remaining));
    } else {
      setTimeLeft('00:00');
    }

    return () => clearInterval(intervalId);
  }, [bet.status, bet.endTime]);

  // Fetch baseline data for active bets
  useEffect(() => {
    if (bet.status === BetStatus.ACTIVE) {
      setLoadingBaseline(true)
      fetchBaselineData(bet.category, chainId)
        .then(setBaselineData)
        .catch(error => {
          console.error('Failed to fetch baseline data:', error)
          setBaselineData(null)
        })
        .finally(() => setLoadingBaseline(false))
    }
  }, [bet.category, bet.status, chainId])

  // Handle transaction success
  useEffect(() => {
    if (isSuccess && hash) {
      const transactionType = lastTransactionRef.current.type
      
      if (transactionType === 'claim') {
        toast.success('Prize claimed successfully!', {
          description: 'Your winnings have been transferred to your wallet.'
        })
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
      reset() // Reset the transaction state
    }
  }, [isSuccess, hash, refetchAllowance, reset])

  const isLoading = isPending || isConfirming

  const handleApproveUSDC = async () => {
    if (!usdcAddress || !chainChaosAddress || !address) {
      toast.error('Contract addresses not available')
      return
    }

    try {
      lastTransactionRef.current.type = 'approve'
      
      // Approve a large amount (max uint256 for convenience)
      const maxApproval = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
      
      writeContract({
        address: usdcAddress,
        abi: ERC20ABI,
        functionName: 'approve',
        args: [chainChaosAddress, maxApproval],
      })
    } catch (error) {
      toast.error('Failed to approve USDC spending')
      console.error(error)
      lastTransactionRef.current.type = null
    }
  }

  const handlePlaceBet = async () => {
    const guess = guessRef.current?.value || ''
    
    if (!guess || !isConnected || !address || !chainChaosAddress) {
      toast.error('Please connect wallet and enter a guess')
      return
    }

    if (!addressesAvailable) {
      toast.error('Contract addresses not available for this network')
      return
    }

    if (bet.currencyType === CurrencyType.USDC && needsApproval) {
      toast.error('Please approve USDC spending first')
      return
    }

    const guessValue = BigInt(Math.floor(parseFloat(guess)))
    
    try {
      lastTransactionRef.current.type = 'bet'
      
      // Use the unified placeBet function
      writeContract({
        address: chainChaosAddress,
        abi: ChainChaosABI,
        functionName: 'placeBet',
        args: [bet.id, guessValue],
        value: bet.currencyType === CurrencyType.NATIVE ? bet.betAmount : BigInt(0),
      })
    } catch (error: any) {
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
  }

  const handleClaimPrize = async () => {
    if (!chainChaosAddress || !address) {
      toast.error('Unable to claim prize')
      return
    }

    if (!addressesAvailable) {
      toast.error('Contract addresses not available for this network')
      return
    }

    try {
      lastTransactionRef.current.type = 'claim'
      
      writeContract({
        address: chainChaosAddress,
        abi: ChainChaosABI,
        functionName: 'claimPrize',
        args: [bet.id],
      })
    } catch (error: any) {
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
    return currencyType === CurrencyType.NATIVE 
      ? formatEther(amount)
      : formatUSDC(amount)
  }

  if (!chainChaosAddress || !addressesAvailable) {
    return (
      <Card className="bet-card opacity-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">
              {formatBetCategory(bet.category)}
            </Badge>
            <Badge variant="destructive" className="text-xs">
              Unavailable
            </Badge>
          </div>
          <CardTitle className="text-lg line-clamp-2">{bet.description}</CardTitle>
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
            {formatBetCategory(bet.category)}
          </Badge>
          <Badge className={`text-xs ${getStatusColor(bet.status)}`}>
            {bet.status === BetStatus.ACTIVE ? 'Active' :
             bet.status === BetStatus.SETTLED ? 'Settled' : 'Cancelled'}
          </Badge>
        </div>
        <CardTitle className="text-lg line-clamp-2">{bet.description}</CardTitle>
        <CardDescription className="flex items-center gap-1 text-xs">
          <Clock className="h-3 w-3" />
          Created {formatTimestamp(Number(bet.createdAt))}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Bet Details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bet-stat">
            <div className="flex items-center gap-1 text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              Bet Amount
            </div>
            <div className="font-semibold flex items-center gap-1">
              <TokenIcon currencyType={bet.currencyType} size={14} />
              {formatAmount(bet.betAmount, bet.currencyType)}
              <span className="text-xs text-muted-foreground">
                {getTokenSymbol(bet.currencyType)}
              </span>
            </div>
          </div>

          <div className="bet-stat">
            <div className="flex items-center gap-1 text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              {bet.status === BetStatus.SETTLED ? 'Prize Pool' : 'Total Pot'}
            </div>
            <div className="font-semibold flex items-center gap-1">
              <TokenIcon currencyType={bet.currencyType} size={14} />
              {bet.status === BetStatus.SETTLED 
                ? formatAmount(bet.totalPot - (bet.totalPot * BigInt(5)) / BigInt(100), bet.currencyType)
                : formatAmount(bet.totalPot, bet.currencyType)
              }
              <span className="text-xs text-muted-foreground">
                {getTokenSymbol(bet.currencyType)}
              </span>
            </div>
            {bet.status === BetStatus.SETTLED && (
              <div className="text-xs text-muted-foreground">
                Total: {formatAmount(bet.totalPot, bet.currencyType)} {getTokenSymbol(bet.currencyType)} (5% fee)
              </div>
            )}
          </div>

          <div className="bet-stat">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="h-3 w-3" />
              Players
            </div>
            <div className="font-semibold">{bet.playerBetCount.toString()}</div>
          </div>

          {timeLeft && bet.status === BetStatus.ACTIVE && (
            <div className="bet-stat">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                Time Left
              </div>
              <div className="font-semibold text-primary">{timeLeft}</div>
            </div>
          )}

          {bet.status === BetStatus.SETTLED && (
            <div className="bet-stat">
              <div className="text-muted-foreground">Actual Value</div>
              <div className="font-semibold text-blue-400">{bet.actualValue.toString()}</div>
            </div>
          )}
        </div>

        {/* Betting Interface */}
        {bet.status === BetStatus.ACTIVE && isConnected && !bet.hasUserBet && (
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
                    {getPredictionHint(bet.category)}
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
                  placeholder={`Enter your prediction${baselineData ? ` (${baselineData.unit})` : ''}...`}
                  className="w-full"
                />
              </div>
              
              {/* USDC Approval Flow */}
              {bet.currencyType === CurrencyType.USDC && needsApproval ? (
                <Button 
                  onClick={handleApproveUSDC}
                  disabled={isLoading || isPlacingBet || !isBettingActive}
                  className="w-full"
                  variant="outline"
                >
                  {isLoading || isPlacingBet ? (
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
                  disabled={isLoading || isPlacingBet || !isBettingActive}
                  className="w-full"
                >
                  {isLoading || isPlacingBet ? (
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
                      Place Bet ({formatAmount(bet.betAmount, bet.currencyType)} {getTokenSymbol(bet.currencyType)})
                    </>
                  )}
                </Button>
              )}
            </div>
          </>
        )}

        {/* Status Messages */}
        {bet.status === BetStatus.ACTIVE && !isConnected && (
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground">Connect wallet to place bet</p>
          </div>
        )}

        {bet.status === BetStatus.ACTIVE && isConnected && bet.hasUserBet && (
          <div className="text-center py-2">
            <Badge variant="outline" className="text-primary border-primary">
              You've placed a bet
            </Badge>
          </div>
        )}

        {bet.status === BetStatus.CANCELLED && bet.refundMode && (
          <div className="text-center py-2">
            <Badge variant="outline" className="text-yellow-500 border-yellow-500">
              Refunds Available
            </Badge>
          </div>
        )}

        {/* Claiming Interface for Settled Bets */}
        {bet.status === BetStatus.SETTLED && isConnected && userParticipated && (
          <>
            <Separator />
            <div className="space-y-3">
              {bet.refundMode ? (
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
                    disabled={isLoading || isClaiming}
                    className="w-full"
                    variant="outline"
                  >
                    {isLoading || isClaiming ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {isConfirming ? 'Confirming...' : 'Claiming...'}
                      </>
                    ) : (
                      <>
                        <Gift className="h-4 w-4 mr-2" />
                        Claim Refund ({formatAmount(bet.betAmount, bet.currencyType)} {getTokenSymbol(bet.currencyType)})
                      </>
                    )}
                  </Button>
                </div>
              ) : winnerIndices && winnerIndices.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Actual result: <span className="font-semibold text-blue-400">{bet.actualValue.toString()}</span></p>
                    <p>{winnerIndices.length} winner{winnerIndices.length > 1 ? 's' : ''} found</p>
                  </div>
                  
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center space-y-2">
                    <Trophy className="h-6 w-6 mx-auto text-blue-500" />
                    <p className="text-sm font-medium">Round Complete</p>
                    <p className="text-xs text-muted-foreground">
                      If your guess was closest to {bet.actualValue.toString()}, you can claim your prize
                    </p>
                  </div>
                  
                  <Button 
                    onClick={handleClaimPrize}
                    disabled={isLoading || isClaiming}
                    className="w-full"
                    variant="outline"
                  >
                    {isLoading || isClaiming ? (
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
                    <p>Actual result: <span className="font-semibold text-blue-400">{bet.actualValue.toString()}</span></p>
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
        {bet.status === BetStatus.SETTLED && isConnected && !userParticipated && (
          <>
            <Separator />
            <div className="text-center py-3 space-y-2">
              <div className="text-xs text-muted-foreground">
                <p>Actual result: <span className="font-semibold text-blue-400">{bet.actualValue.toString()}</span></p>
                {winnerIndices && winnerIndices.length > 0 && (
                  <p>{winnerIndices.length} winner{winnerIndices.length > 1 ? 's' : ''} found</p>
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