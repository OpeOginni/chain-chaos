'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EtherlinkIcon } from '@/components/ui/EtherlinkLogo'
import { isEtherlinkChain, getEtherlinkChainName } from '@/lib/wagmi'
import { Wallet, ChevronDown, Copy, ExternalLink, LogOut, User } from 'lucide-react'
import { toast } from 'sonner'

export function WalletConnection() {
  const { address, isConnected, chain } = useAccount()
  const { connectors, connect, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      toast.success('Address copied to clipboard')
    }
  }

  const openBlockExplorer = () => {
    if (address && chain) {
      let explorerUrl = ''
      
      if (isEtherlinkChain(chain.id)) {
        explorerUrl = chain.blockExplorers?.default?.url || 'https://explorer.etherlink.com'
      } else {
        explorerUrl = chain.blockExplorers?.default?.url || `https://etherscan.io`
      }
      
      window.open(`${explorerUrl}/address/${address}`, '_blank')
    }
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const getNetworkDisplay = () => {
    if (!chain) return 'Unknown Network'
    
    if (isEtherlinkChain(chain.id)) {
      return getEtherlinkChainName(chain.id)
    }
    
    return chain.name || 'Unknown Network'
  }

  const getNetworkBadgeVariant = () => {
    if (!chain) return 'secondary'
    
    if (isEtherlinkChain(chain.id)) {
      return 'default' // Primary Etherlink styling
    }
    
    return 'secondary' // Other networks
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <Badge variant={getNetworkBadgeVariant()} className="px-3 py-1 flex items-center gap-1">
          {isEtherlinkChain(chain?.id) && <EtherlinkIcon size={14} />}
          {getNetworkDisplay()}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">{formatAddress(address)}</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Wallet Connected
            </DropdownMenuLabel>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={copyAddress} className="flex items-center gap-2">
              <Copy className="h-4 w-4" />
              Copy Address
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={openBlockExplorer} className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              View on Explorer
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              onClick={() => disconnect()}
              className="flex items-center gap-2 text-red-600 focus:text-red-600"
            >
              <LogOut className="h-4 w-4" />
              Disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="flex items-center gap-2 glow-primary">
          <Wallet className="h-4 w-4" />
          Connect Wallet
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {connectors.map((connector) => (
          <DropdownMenuItem
            key={connector.uid}
            onClick={() => connect({ connector })}
            disabled={isPending}
            className="flex items-center gap-2"
          >
            <Wallet className="h-4 w-4" />
            {connector.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 