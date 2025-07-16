'use client'

import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EtherlinkIcon } from '@/components/ui/EtherlinkLogo'
import { 
  isEtherlinkChain, 
  getEtherlinkChainName, 
  etherlinkMainnet, 
  etherlinkTestnet,
  areAddressesAvailable 
} from '@/lib/wagmi'
import { AlertTriangle, CheckCircle, Wifi, ExternalLink, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export function NetworkStatus() {
  const { isConnected, chain } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending } = useSwitchChain()

  if (!isConnected) {
    return null
  }

  const isEtherlink = isEtherlinkChain(chainId)
  const networkName = getEtherlinkChainName(chainId)
  const addressesAvailable = areAddressesAvailable(chainId)

  const handleSwitchChain = async (targetChainId: number) => {
    try {
      await switchChain({ chainId: targetChainId })
      toast.success(`Switched to ${getEtherlinkChainName(targetChainId)}`)
    } catch (error) {
      toast.error('Failed to switch network')
      console.error(error)
    }
  }

  // If on Etherlink but addresses not available
  if (isEtherlink && !addressesAvailable) {
    return (
      <Alert className="border-red-500/20 bg-red-500/5">
        <AlertTriangle className="h-4 w-4 text-red-500" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div>
              <EtherlinkIcon size={16} className="inline mr-2" />
              Connected to {networkName} but contract addresses are not configured.
              <div className="text-xs text-muted-foreground mt-1">
                Please configure environment variables for this network.
              </div>
            </div>
            <Badge variant="destructive" className="text-xs">
              Not Available
            </Badge>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  // If on Etherlink and addresses available
  if (isEtherlink && addressesAvailable) {
    const isMainnet = chainId === etherlinkMainnet.id
    const badgeColor = isMainnet ? 'default' : 'secondary'
    
    return (
      <Alert className="border-primary/20 bg-primary/5">
        <CheckCircle className="h-4 w-4 text-primary" />
        <AlertDescription className="flex items-center gap-2">
          <EtherlinkIcon size={16} />
          Connected to {networkName}
          <Badge variant={badgeColor} className="text-xs">
            <Wifi className="h-3 w-3 mr-1" />
            Ready
          </Badge>
        </AlertDescription>
      </Alert>
    )
  }

  // If not on Etherlink - show switch options
  const availableNetworks = []
  
  if (areAddressesAvailable(etherlinkMainnet.id)) {
    availableNetworks.push({
      id: etherlinkMainnet.id,
      name: 'Etherlink Mainnet',
      isPrimary: true
    })
  }
  
  if (areAddressesAvailable(etherlinkTestnet.id)) {
    availableNetworks.push({
      id: etherlinkTestnet.id,
      name: 'Etherlink Testnet',
      isPrimary: false
    })
  }

  if (availableNetworks.length === 0) {
    return (
      <Alert className="border-red-500/20 bg-red-500/5">
        <AlertTriangle className="h-4 w-4 text-red-500" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div>
              No Etherlink networks are configured with contract addresses.
              <div className="text-xs text-muted-foreground mt-1">
                Please configure environment variables for at least one network.
              </div>
            </div>
            <Badge variant="destructive" className="text-xs">
              Unavailable
            </Badge>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert className="border-yellow-500/20 bg-yellow-500/5">
      <AlertTriangle className="h-4 w-4 text-yellow-500" />
      <AlertDescription>
        <div className="space-y-3">
          <div>
            You're connected to <strong>{chain?.name || 'Unknown Network'}</strong>. 
            For the best experience, please switch to one of the supported Etherlink networks:
          </div>
          <div className="flex flex-wrap gap-2">
            {availableNetworks.map((network) => (
              <Button
                key={network.id}
                variant={network.isPrimary ? 'default' : 'secondary'}
                size="sm"
                onClick={() => handleSwitchChain(network.id)}
                disabled={isPending}
                className="flex items-center gap-2"
              >
                {isPending ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <EtherlinkIcon size={14} />
                )}
                Switch to {network.name}
                <ExternalLink className="h-3 w-3" />
              </Button>
            ))}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
} 