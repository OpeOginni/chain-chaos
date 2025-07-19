'use client'

import { useState, useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi'
import { formatEther, formatUnits } from 'viem'
import { formatActualValue, getCategoryUnit, isGasCategory } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ChainChaosABI } from '@/blockchain/ChainChaosABI'
import { 
  BetInfo, 
  BetStatus, 
  CurrencyType
} from '@/lib/types'
import {
  getChainChaosAddress,
  areAddressesAvailable 
} from '@/lib/thirdweb'
import { TokenIcon, getTokenSymbol } from '@/components/ui/TokenIcon'
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar, 
  Target, 
  XCircle, 
  CheckCircle, 
  Clock,
  Loader2,
  AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'

interface AdminBetCardProps {
  bet: BetInfo
  isActive: boolean
  onBetUpdate: () => void
}

export function AdminBetCard({ bet, isActive, onBetUpdate }: AdminBetCardProps) {
  const chainId = useChainId()
  const [settleDialogOpen, setSettleDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [actualValue, setActualValue] = useState('')
  const [currentAction, setCurrentAction] = useState<'settle' | 'cancel' | null>(null)

  const chainChaosAddress = getChainChaosAddress(chainId)
  const addressesAvailable = areAddressesAvailable(chainId)

  const { writeContract, data: hash, isPending, reset } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const isLoading = isPending || isConfirming

  // Handle transaction success
  useEffect(() => {
    if (isSuccess && hash) {
      const actionText = currentAction === 'settle' ? 'settled' : 'cancelled'
      toast.success(`Bet ${actionText} successfully!`, {
        description: `Bet #${bet.id.toString()} has been ${actionText}.`
      })
      
      setSettleDialogOpen(false)
      setCancelDialogOpen(false)
      setActualValue('')
      setCurrentAction(null)
      onBetUpdate()
      reset() // Reset the transaction state
    }
  }, [isSuccess, hash, currentAction, bet.id, onBetUpdate, reset])

  const handleSettleBet = async () => {
    if (!actualValue || parseFloat(actualValue) < 0) {
      toast.error('Please enter a valid actual value')
      return
    }

    if (!chainChaosAddress || !addressesAvailable) {
      toast.error('Contract not available on this network')
      return
    }

    try {
      setCurrentAction('settle')
      
      // Use raw value for all categories (no conversion needed)
      const value = BigInt(Math.floor(parseFloat(actualValue)))
      
      writeContract({
        address: chainChaosAddress,
        abi: ChainChaosABI,
        functionName: 'settleBet',
        args: [bet.id, value],
      })
    } catch (error) {
      toast.error('Failed to settle bet')
      console.error(error)
      setCurrentAction(null)
    }
  }

  const handleCancelBet = async () => {
    if (!chainChaosAddress || !addressesAvailable) {
      toast.error('Contract not available on this network')
      return
    }

    try {
      setCurrentAction('cancel')
      
      writeContract({
        address: chainChaosAddress,
        abi: ChainChaosABI,
        functionName: 'cancelBet',
        args: [bet.id],
      })
    } catch (error) {
      toast.error('Failed to cancel bet')
      console.error(error)
      setCurrentAction(null)
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

  const getStatusIcon = (status: BetStatus) => {
    switch (status) {
      case BetStatus.ACTIVE:
        return <Clock className="h-3 w-3" />
      case BetStatus.SETTLED:
        return <CheckCircle className="h-3 w-3" />
      case BetStatus.CANCELLED:
        return <XCircle className="h-3 w-3" />
      default:
        return <Clock className="h-3 w-3" />
    }
  }

  const formatAmount = (amount: bigint, currencyType: CurrencyType) => {
    return currencyType === CurrencyType.XTZ 
      ? formatEther(amount)
      : formatUnits(amount, 6) // USDC has 6 decimals
  }

  const formatBetCategory = (category: string) => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
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
              Contract Unavailable
            </Badge>
          </div>
          <CardTitle className="text-lg line-clamp-2">{bet.description}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-yellow-500/20 bg-yellow-500/5">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-sm">
              Contract addresses not configured for this network
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bet-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-xs">
            {formatBetCategory(bet.category)}
          </Badge>
          <div className="flex items-center gap-2">
            <Badge className={`text-xs ${getStatusColor(bet.status)}`}>
              {bet.status === BetStatus.ACTIVE ? 'Active' :
               bet.status === BetStatus.SETTLED ? 'Settled' : 'Cancelled'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              #{bet.id.toString()}
            </Badge>
          </div>
        </div>
        
        <CardTitle className="text-lg line-clamp-2">{bet.description}</CardTitle>
        
        <CardDescription className="flex items-center gap-1 text-xs">
          <Calendar className="h-3 w-3" />
          Created {new Date(Number(bet.createdAt) * 1000).toLocaleDateString()}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Bet Statistics */}
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

          <div className="bet-stat">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Target className="h-3 w-3" />
              Actual Value
            </div>
            <div className="font-semibold">
              {bet.status === BetStatus.SETTLED ? 
                <span className="text-blue-400">{formatActualValue(bet.actualValue)}</span> : 
                <span className="text-muted-foreground">Pending</span>
              }
            </div>
          </div>
        </div>

        {/* Admin Actions */}
        {isActive && bet.status === BetStatus.ACTIVE && (
          <>
            <Separator />
            <div className="flex gap-2">
              {/* Settle Bet Dialog */}
              <Dialog open={settleDialogOpen} onOpenChange={setSettleDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="flex-1"
                    disabled={isLoading}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Settle Bet
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Settle Bet #{bet.id.toString()}</DialogTitle>
                    <DialogDescription>
                      Enter the actual value to settle this bet and distribute prizes to winners.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-medium mb-2">Bet Details</h4>
                      <p className="text-sm text-muted-foreground">{bet.description}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs">
                        <TokenIcon currencyType={bet.currencyType} size={12} />
                        <span>Total Pot: {formatAmount(bet.totalPot, bet.currencyType)} {getTokenSymbol(bet.currencyType)}</span>
                        <span>• Players: {bet.playerBetCount.toString()}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="actualValue" className="text-sm font-medium">
                        Actual Value
                      </Label>
                      <Input
                        id="actualValue"
                        type="number"
                        step="1"
                        placeholder="Enter actual value"
                        value={actualValue}
                        onChange={(e) => setActualValue(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        This value will determine the winners and prize distribution.
                      </p>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setSettleDialogOpen(false)}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSettleBet}
                      disabled={!actualValue || isLoading}
                    >
                      {isLoading && currentAction === 'settle' ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {isConfirming ? 'Confirming...' : 'Settling...'}
                        </>
                      ) : (
                        'Settle Bet'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Cancel Bet Dialog */}
              <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="flex-1"
                    disabled={isLoading}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Bet
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cancel Bet #{bet.id.toString()}</DialogTitle>
                    <DialogDescription>
                      This will cancel the bet and enable refunds for all participants.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Alert className="border-yellow-500/20 bg-yellow-500/5">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <AlertDescription>
                      <strong>Warning:</strong> This action cannot be undone. All players will be able to claim refunds of their bet amounts.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-2">Bet Details</h4>
                    <p className="text-sm text-muted-foreground">{bet.description}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <TokenIcon currencyType={bet.currencyType} size={12} />
                      <span>Total Pot: {formatAmount(bet.totalPot, bet.currencyType)} {getTokenSymbol(bet.currencyType)}</span>
                      <span>• Players: {bet.playerBetCount.toString()}</span>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setCancelDialogOpen(false)}
                      disabled={isLoading}
                    >
                      Keep Bet Active
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={handleCancelBet}
                      disabled={isLoading}
                    >
                      {isLoading && currentAction === 'cancel' ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {isConfirming ? 'Confirming...' : 'Cancelling...'}
                        </>
                      ) : (
                        'Yes, Cancel Bet'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </>
        )}

        {/* Bet Status Information */}
        {bet.status === BetStatus.SETTLED && (
          <Alert className="border-blue-500/20 bg-blue-500/5">
            <CheckCircle className="h-4 w-4 text-blue-500" />
            <AlertDescription>
              Bet settled with actual value: <strong>{formatActualValue(bet.actualValue)}</strong>
            </AlertDescription>
          </Alert>
        )}

        {bet.status === BetStatus.CANCELLED && (
          <Alert className="border-red-500/20 bg-red-500/5">
            <XCircle className="h-4 w-4 text-red-500" />
            <AlertDescription>
              Bet cancelled - {bet.refundMode ? 'Refunds available' : 'Refunds processed'}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
} 