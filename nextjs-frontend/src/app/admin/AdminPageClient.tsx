'use client'

import React from 'react'
import { useActiveAccount, useActiveWalletChain, useReadContract } from 'thirdweb/react'
import { ConnectButton } from 'thirdweb/react'
import { AdminBetCard } from '@/components/admin/AdminBetCard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { EtherlinkLogo } from '@/components/ui/EtherlinkLogo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  getChainChaosContract,
  getChainChaosAddress,
  areAddressesAvailable,
  isEtherlinkChain,
  getEtherlinkChainName,
  supportedChains,
  defaultChain
} from '@/lib/thirdweb'
import { client } from '@/lib/client'
import { BetInfo } from '@/lib/types'
import { Settings, TrendingUp, Clock, Shield, DollarSign, AlertTriangle, Home, Gamepad2 } from 'lucide-react'

export function AdminPageClient() {
  const account = useActiveAccount()
  const activeChain = useActiveWalletChain()
  const chainId = activeChain?.id || defaultChain.id

  const chainChaosAddress = getChainChaosAddress(chainId)
  const addressesAvailable = areAddressesAvailable(chainId)
  const isEtherlink = isEtherlinkChain(chainId)
  const contract = getChainChaosContract(chainId)
  const isConnected = !!account

  // Read contract owner
  const { 
    data: owner, 
    isLoading: ownerLoading, 
    isError: ownerError 
  } = useReadContract({
    contract: contract!,
    method: 'owner',
    queryOptions: {
      enabled: !!contract && isConnected && addressesAvailable,
    }
  })

  // Calculate ownership status
  const isOwner = !!(owner && account?.address && owner.toLowerCase() === account.address.toLowerCase())
  const shouldShowContent = isConnected && !ownerLoading && !ownerError && isOwner && addressesAvailable

  // Read active bets
  const { 
    data: activeBetIds, 
    isLoading: loadingActive, 
    refetch: refetchActive 
  } = useReadContract({
    contract: contract!,
    method: 'getActiveBets',
    queryOptions: {
      enabled: shouldShowContent,
      refetchInterval: 30 * 1000,
    }
  })

  // Read settled bets
  const { 
    data: settledBetIds, 
    isLoading: loadingSettled, 
    refetch: refetchSettled 
  } = useReadContract({
    contract: contract!,
    method: 'getSettledBets',
    queryOptions: {
      enabled: shouldShowContent,
      refetchInterval: 30 * 1000,
    }
  })

  const handleBetUpdate = () => {
    refetchActive()
    refetchSettled()
  }

  // Show loading while wallet is connecting or initializing
  if (!account && typeof window !== 'undefined') {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
        <div className="flex-1 flex flex-col">
          <header className="border-b bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
            <div className="max-w-6xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    🎲 ChainChaos Admin
                  </h1>
                </div>
                <div className="flex items-center gap-4">
                  <ConnectButton
                    client={client}
                    chains={supportedChains}
                    appMetadata={{
                      name: "ChainChaos Admin",
                      url: "https://chainchaos.com",
                      description: "Admin panel for ChainChaos prediction markets",
                    }}
                  />
                </div>
              </div>
            </div>
          </header>
          
          <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
              <Shield className="h-16 w-16 text-muted-foreground" />
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold">Admin Access Required</h1>
                <p className="text-muted-foreground">Please connect your wallet to access the admin panel</p>
              </div>
              <Button onClick={() => window.location.href = '/'}>
                <Home className="h-4 w-4 mr-2" />
                Return Home
              </Button>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
        <div className="flex-1 flex flex-col">
          <header className="border-b bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
            <div className="max-w-6xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    🎲 ChainChaos Admin
                  </h1>
                </div>
                <div className="flex items-center gap-4">
                  <ConnectButton
                    client={client}
                    chains={supportedChains}
                    appMetadata={{
                      name: "ChainChaos Admin",
                      url: "https://chainchaos.com",
                      description: "Admin panel for ChainChaos prediction markets",
                    }}
                  />
                </div>
              </div>
            </div>
          </header>
          
          <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
              <Shield className="h-16 w-16 text-muted-foreground" />
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold">Admin Access Required</h1>
                <p className="text-muted-foreground">Please connect your wallet to access the admin panel</p>
              </div>
              <Button onClick={() => window.location.href = '/'}>
                <Home className="h-4 w-4 mr-2" />
                Return Home
              </Button>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (!isEtherlink) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
        <div className="flex-1 flex flex-col">
          <header className="border-b bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
            <div className="max-w-6xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    🎲 ChainChaos Admin
                  </h1>
                </div>
                <div className="flex items-center gap-4">
                  <ConnectButton
                    client={client}
                    chains={supportedChains}
                    appMetadata={{
                      name: "ChainChaos Admin",
                      url: "https://chainchaos.com",
                      description: "Admin panel for ChainChaos prediction markets",
                    }}
                  />
                </div>
              </div>
            </div>
          </header>
          
          <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
            <Alert className="max-w-md mx-auto mt-16">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold">Unsupported Network</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Admin panel is only available on Etherlink networks.
                    </p>
                  </div>
                  <Button onClick={() => window.location.href = '/'} className="w-full">
                    <Home className="h-4 w-4 mr-2" />
                    Return Home
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </main>
        </div>
      </div>
    )
  }

  if (!addressesAvailable) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
        <div className="flex-1 flex flex-col">
          <header className="border-b bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
            <div className="max-w-6xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    🎲 ChainChaos Admin
                  </h1>
                </div>
                <div className="flex items-center gap-4">
                  <ConnectButton
                    client={client}
                    chains={supportedChains}
                    appMetadata={{
                      name: "ChainChaos Admin",
                      url: "https://chainchaos.com",
                      description: "Admin panel for ChainChaos prediction markets",
                    }}
                  />
                </div>
              </div>
            </div>
          </header>
          
          <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
            <Alert className="max-w-md mx-auto mt-16 border-red-500/20 bg-red-500/5">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <AlertDescription>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold">Service Unavailable</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Contract addresses are not configured for {getEtherlinkChainName(chainId)}.
                    </p>
                  </div>
                  <Button onClick={() => window.location.href = '/'} className="w-full">
                    <Home className="h-4 w-4 mr-2" />
                    Return Home
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </main>
        </div>
      </div>
    )
  }

  if (ownerLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
        <div className="flex-1 flex flex-col">
          <header className="border-b bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
            <div className="max-w-6xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    🎲 ChainChaos Admin
                  </h1>
                </div>
                <div className="flex items-center gap-4">
                  <ConnectButton
                    client={client}
                    chains={supportedChains}
                    appMetadata={{
                      name: "ChainChaos Admin",
                      url: "https://chainchaos.com",
                      description: "Admin panel for ChainChaos prediction markets",
                    }}
                  />
                </div>
              </div>
            </div>
          </header>
          
          <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
              <Shield className="h-16 w-16 text-muted-foreground animate-pulse" />
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold">Verifying Access...</h1>
                <p className="text-muted-foreground">Checking admin permissions</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (ownerError || !isOwner) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
        <div className="flex-1 flex flex-col">
          <header className="border-b bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
            <div className="max-w-6xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    🎲 ChainChaos Admin
                  </h1>
                </div>
                <div className="flex items-center gap-4">
                  <ConnectButton
                    client={client}
                    chains={supportedChains}
                    appMetadata={{
                      name: "ChainChaos Admin",
                      url: "https://chainchaos.com",
                      description: "Admin panel for ChainChaos prediction markets",
                    }}
                  />
                </div>
              </div>
            </div>
          </header>
          
          <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
            <Alert className="max-w-md mx-auto mt-16 border-red-500/20 bg-red-500/5">
              <Shield className="h-4 w-4 text-red-500" />
              <AlertDescription>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold">Access Denied</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      You don't have permission to access the admin panel. Only the contract owner can manage bets.
                    </p>
                  </div>
                  <Button onClick={() => window.location.href = '/'} className="w-full">
                    <Home className="h-4 w-4 mr-2" />
                    Return Home
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  🎲 ChainChaos Admin
                </h1>
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">on</span>
                  <EtherlinkLogo size={20} />
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-primary border-primary">
                  <Shield className="h-3 w-3 mr-1" />
                  Contract Owner
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {getEtherlinkChainName(chainId)}
                </Badge>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/'}
                >
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </Button>
                <ConnectButton
                  client={client}
                  chains={supportedChains}
                  appMetadata={{
                    name: "ChainChaos Admin",
                    url: "https://chainchaos.com",
                    description: "Admin panel for ChainChaos prediction markets",
                  }}
                />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 space-y-8">
          {/* Welcome Section */}
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold">ChainChaos Management</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Manage your prediction markets and oversee platform operations. Admin can only cancel active bets.
            </p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Bets</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {loadingActive ? '...' : activeBetIds?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Currently accepting predictions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Settled Bets</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-400">
                  {loadingSettled ? '...' : settledBetIds?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Completed and paid out
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Bets</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loadingActive || loadingSettled ? 
                    '...' : 
                    ((activeBetIds?.length || 0) + (settledBetIds?.length || 0))
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  All time bet count
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Bets Management */}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-80 w-full" />
                  ))}
                </div>
              ) : activeBetIds && activeBetIds.length > 0 ? (
                <AdminBetsList 
                  betIds={activeBetIds} 
                  isActive={true} 
                  onBetUpdate={handleBetUpdate}
                  chainId={chainId}
                />
              ) : (
                <div className="text-center py-16 space-y-4">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold">No Active Bets</h3>
                    <p className="text-muted-foreground">No active bets to manage at the moment.</p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="settled" className="space-y-6">
              {loadingSettled ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-80 w-full" />
                  ))}
                </div>
              ) : settledBetIds && settledBetIds.length > 0 ? (
                <AdminBetsList 
                  betIds={settledBetIds} 
                  isActive={false} 
                  onBetUpdate={handleBetUpdate}
                  chainId={chainId}
                />
              ) : (
                <div className="text-center py-16 space-y-4">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold">No Settled Bets</h3>
                    <p className="text-muted-foreground">Settled bets will appear here once completed.</p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}

// Component for rendering a list of admin bets
function AdminBetsList({ 
  betIds, 
  isActive, 
  onBetUpdate,
  chainId 
}: { 
  betIds: readonly bigint[]
  isActive: boolean
  onBetUpdate: () => void
  chainId: number
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {betIds.map((betId) => (
        <AdminBetWrapper
          key={betId.toString()}
          betId={betId}
          isActive={isActive}
          onBetUpdate={onBetUpdate}
          chainId={chainId}
        />
      ))}
    </div>
  )
}

// Wrapper component for individual admin bet cards
function AdminBetWrapper({ 
  betId, 
  isActive, 
  onBetUpdate,
  chainId 
}: { 
  betId: bigint
  isActive: boolean
  onBetUpdate: () => void
  chainId: number
}) {
  const contract = getChainChaosContract(chainId)

  const { data: betInfo, isLoading } = useReadContract({
    contract: contract!,
    method: 'getBetInfo',
    params: [betId],
    queryOptions: {
      enabled: !!contract,
      refetchInterval: 15 * 1000,
    }
  })

  if (isLoading) {
    return <Skeleton className="h-80 w-full" />
  }

  if (!betInfo || !contract) {
    return null
  }

  const bet: BetInfo = {
    id: betInfo[0],
    category: betInfo[1],
    description: betInfo[2],
    currencyType: Number(betInfo[3]),
    betAmount: betInfo[4],
    actualValue: betInfo[5],
    status: Number(betInfo[6]),
    totalPot: betInfo[7],
    refundMode: betInfo[8],
    playerBetCount: betInfo[9],
    createdAt: betInfo[10],
    startTime: betInfo[11],
    endTime: betInfo[12],
  }

  return (
    <AdminBetCard 
      bet={bet} 
      isActive={isActive}
      onBetUpdate={onBetUpdate}
      chainId={chainId}
    />
  )
} 