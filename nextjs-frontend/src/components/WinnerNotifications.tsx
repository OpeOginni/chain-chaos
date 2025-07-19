'use client'

import { useEffect, useState } from 'react'
import { useActiveAccount } from "thirdweb/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatEther, formatUSDC, formatBetCategory } from '@/lib/utils'
import { TokenIcon, getTokenSymbol } from '@/components/ui/TokenIcon'
import { CurrencyType } from '@/lib/types'
import { Gift, X, ExternalLink, Bell, Trophy } from 'lucide-react'
import { toast } from 'sonner'

interface WinnerNotification {
  betId: string
  winnerAddress: string
  betCategory: string
  betDescription: string
  prizeAmount: string
  currencyType: number
  settledAt: string
  txHash?: string
}

interface WinnerNotificationsProps {
  onClaimSuccess?: () => void
}

export function WinnerNotifications({ onClaimSuccess }: WinnerNotificationsProps) {
  const account = useActiveAccount()
  const isConnected = !!account
  const address = account?.address
  const [notifications, setNotifications] = useState<WinnerNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [dismissing, setDismissing] = useState<string | null>(null)

  useEffect(() => {
    if (isConnected && address) {
      fetchNotifications()
    } else {
      setNotifications([])
    }
  }, [address, isConnected])

  const fetchNotifications = async () => {
    if (!address) return

    setLoading(true)
    try {
      const response = await fetch(`/api/notifications?address=${address}`)
      const data = await response.json()
      
      if (response.ok) {
        setNotifications(data.notifications || [])
      } else {
        console.error('Failed to fetch notifications:', data.error)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const dismissNotification = async (betId: string) => {
    if (!address) return

    setDismissing(betId)
    try {
      const response = await fetch(`/api/notifications?address=${address}&betId=${betId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.betId !== betId))
        toast.success('Notification dismissed')
      } else {
        toast.error('Failed to dismiss notification')
      }
    } catch (error) {
      console.error('Error dismissing notification:', error)
      toast.error('Error dismissing notification')
    } finally {
      setDismissing(null)
    }
  }

  const formatAmount = (amount: string, currencyType: number) => {
    const value = BigInt(amount)
    return currencyType === CurrencyType.XTZ 
      ? formatEther(value)
      : formatUSDC(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!isConnected || notifications.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <Alert className="border-yellow-500/20 bg-yellow-500/10">
        <Bell className="h-4 w-4 text-yellow-500" />
        <AlertDescription className="text-yellow-700 dark:text-yellow-300">
          🎉 You have {notifications.length} unclaimed reward{notifications.length > 1 ? 's' : ''}! 
          Click on each bet below to claim your prizes.
        </AlertDescription>
      </Alert>

      <div className="space-y-3">
        {notifications.map((notification) => (
          <Card key={`${notification.betId}-${notification.winnerAddress}`} 
                className="border-l-4 border-l-yellow-500 bg-gradient-to-r from-yellow-500/5 to-transparent">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <Badge variant="secondary" className="text-xs">
                    {formatBetCategory(notification.betCategory)}
                  </Badge>
                  <Badge className="text-xs bg-yellow-500/20 text-yellow-700 dark:text-yellow-300">
                    Winner!
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dismissNotification(notification.betId)}
                  disabled={dismissing === notification.betId}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <CardTitle className="text-base line-clamp-2">
                {notification.betDescription}
              </CardTitle>
              <CardDescription className="text-xs">
                Settled on {formatDate(notification.settledAt)}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">Your Prize:</span>
                </div>
                <div className="flex items-center gap-1 font-semibold text-yellow-600 dark:text-yellow-400">
                  <TokenIcon currencyType={notification.currencyType} size={16} />
                  {formatAmount(notification.prizeAmount, notification.currencyType)}
                  <span className="text-xs">
                    {getTokenSymbol(notification.currencyType)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white"
                  onClick={() => {
                    // Navigate to the specific bet to claim
                    window.location.href = `/history?highlight=${notification.betId}`
                    onClaimSuccess?.()
                  }}
                >
                  <Gift className="h-4 w-4 mr-2" />
                  Claim Prize
                </Button>
                
                {notification.txHash && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const explorerUrl = process.env.NODE_ENV === 'production' 
                        ? `https://explorer.etherlink.com/tx/${notification.txHash}`
                        : `https://testnet.explorer.etherlink.com/tx/${notification.txHash}`
                      window.open(explorerUrl, '_blank')
                    }}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
} 