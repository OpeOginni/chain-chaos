'use client'

import { useState, useEffect } from 'react'
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
import { formatEther, formatUSDC, formatBetCategory, formatTimestamp } from '@/lib/utils'
import { TokenIcon, getTokenSymbol } from '@/components/ui/TokenIcon'
import { Clock, Users, DollarSign, TrendingUp, Loader2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface BetCardProps {
  bet: BetInfo & { hasUserBet?: boolean }
  chainId: number
}

export function BetCard({ bet, chainId }: BetCardProps) {
  const { address, isConnected } = useAccount()
  const [guess, setGuess] = useState('')
  const [isPlacingBet, setIsPlacingBet] = useState(false)
  const [needsApproval, setNeedsApproval] = useState(false)

  const chainChaosAddress = getChainChaosAddress(chainId)
  const usdcAddress = getUSDCAddress(chainId)
  const addressesAvailable = areAddressesAvailable(chainId)

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

  // Check if approval is needed for USDC bets
  useEffect(() => {
    if (bet.currencyType === CurrencyType.USDC && allowance !== undefined) {
      setNeedsApproval(allowance < bet.betAmount)
    } else {
      setNeedsApproval(false)
    }
  }, [allowance, bet.betAmount, bet.currencyType])

  // Handle transaction success
  useEffect(() => {
    if (isSuccess && hash) {
      toast.success('Transaction confirmed!', {
        description: bet.currencyType === CurrencyType.USDC && needsApproval 
          ? 'USDC spending approved. You can now place your bet.'
          : 'Bet placed successfully!'
      })
      
      if (bet.currencyType === CurrencyType.USDC && needsApproval) {
        // If this was an approval, refetch allowance
        refetchAllowance()
      } else {
        // If this was a bet placement, clear the guess
        setGuess('')
      }
      
      setIsPlacingBet(false)
      reset() // Reset the transaction state
    }
  }, [isSuccess, hash, needsApproval, bet.currencyType, refetchAllowance, reset])

  const isLoading = isPending || isConfirming

  const handleApproveUSDC = async () => {
    if (!usdcAddress || !chainChaosAddress || !address) {
      toast.error('Contract addresses not available')
      return
    }

    try {
      setIsPlacingBet(true)
      
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
      setIsPlacingBet(false)
    }
  }

  const handlePlaceBet = async () => {
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
      setIsPlacingBet(true)
      
      if (bet.currencyType === CurrencyType.NATIVE) {
        writeContract({
          address: chainChaosAddress,
          abi: ChainChaosABI,
          functionName: 'placeBetNative',
          args: [bet.id, guessValue],
          value: bet.betAmount,
        })
      } else {
        writeContract({
          address: chainChaosAddress,
          abi: ChainChaosABI,
          functionName: 'placeBetUSDC',
          args: [bet.id, guessValue],
        })
      }
    } catch (error) {
      toast.error('Failed to place bet')
      console.error(error)
      setIsPlacingBet(false)
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
              Total Pot
            </div>
            <div className="font-semibold flex items-center gap-1">
              <TokenIcon currencyType={bet.currencyType} size={14} />
              {formatAmount(bet.totalPot, bet.currencyType)}
              <span className="text-xs text-muted-foreground">
                {getTokenSymbol(bet.currencyType)}
              </span>
            </div>
          </div>

          <div className="bet-stat">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="h-3 w-3" />
              Players
            </div>
            <div className="font-semibold">{bet.playerBetCount.toString()}</div>
          </div>

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
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="guess" className="text-sm font-medium">
                  Your Prediction
                </Label>
                <Input
                  id="guess"
                  type="number"
                  placeholder="Enter your guess..."
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  className="w-full"
                />
              </div>
              
              {/* USDC Approval Flow */}
              {bet.currencyType === CurrencyType.USDC && needsApproval ? (
                <Button 
                  onClick={handleApproveUSDC}
                  disabled={isLoading || isPlacingBet}
                  className="w-full"
                  variant="outline"
                >
                  {isLoading || isPlacingBet ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isConfirming ? 'Confirming...' : 'Approving...'}
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
                  disabled={!guess || isLoading || isPlacingBet}
                  className="w-full"
                >
                  {isLoading || isPlacingBet ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isConfirming ? 'Confirming...' : 'Placing Bet...'}
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
      </CardContent>
    </Card>
  )
} 