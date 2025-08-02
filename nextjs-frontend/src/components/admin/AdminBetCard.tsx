'use client'

import { useState } from 'react'
import { useSendTransaction } from 'thirdweb/react'
import { prepareContractCall } from 'thirdweb'
import { formatEther, formatUnits } from 'viem'
import { formatActualValue } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { 
  BetInfo, 
  BetStatus, 
  CurrencyType
} from '@/lib/types'
import {
  getChainChaosContract,
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
  Loader2,
  AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'

interface AdminBetCardProps {
  bet: BetInfo
  isActive: boolean
  onBetUpdate: () => void
  chainId: number
}

export function AdminBetCard({ bet, isActive, onBetUpdate, chainId }: AdminBetCardProps) {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const chainChaosAddress = getChainChaosAddress(chainId)
  const addressesAvailable = areAddressesAvailable(chainId)
  const contract = getChainChaosContract(chainId)

  const { mutate: sendTransaction } = useSendTransaction()

  const handleCancelBet = async () => {
    if (!contract || !addressesAvailable) {
      toast.error('Contract not available on this network')
      return
    }

    try {
      setIsProcessing(true)
      
      const transaction = prepareContractCall({
        contract,
        method: 'cancelBet',
        params: [bet.id],
      })
      
      sendTransaction(transaction as any, {
        onSuccess: () => {
          toast.success('Bet cancelled successfully!', {
            description: `Bet #${bet.id.toString()} has been cancelled. Refunds are now available.`,
            descriptionClassName: 'text-sm text-white/80'
          })
          setCancelDialogOpen(false)
          onBetUpdate()
          setIsProcessing(false)
        },
        onError: (error) => {
          toast.error('Failed to cancel bet')
          console.error(error)
          setIsProcessing(false)
        }
      })
    } catch (error) {
      toast.error('Failed to prepare transaction')
      console.error(error)
      setIsProcessing(false)
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
        {isActive && bet.status === BetStatus.ACTIVE && bet.endTime < Date.now() && (
          <>
            <Separator />
            <div className="flex gap-2">
              {/* Cancel Bet Dialog */}
              <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="w-full"
                    disabled={isProcessing}
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
                      disabled={isProcessing}
                    >
                      Keep Bet Active
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={handleCancelBet}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Cancelling...
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