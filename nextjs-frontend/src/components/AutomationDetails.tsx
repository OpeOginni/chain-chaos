'use client'

import { useReadContract } from 'wagmi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChainChaosABI } from '@/blockchain/ChainChaosABI'
import { BetAutomationData, getChainChaosAddress } from '@/lib/wagmi'
import { ChevronDown, ChevronRight, Bot, Calculator, Hash, Clock } from 'lucide-react'
import { useState } from 'react'

interface AutomationDetailsProps {
  betId: bigint
  chainId: number
  isSettled?: boolean
}

export function AutomationDetails({ betId, chainId, isSettled = false }: AutomationDetailsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const chainChaosAddress = getChainChaosAddress(chainId)

  const { data: automationData, isLoading } = useReadContract({
    address: chainChaosAddress,
    abi: ChainChaosABI,
    functionName: 'getBetAutomationData',
    args: [betId],
    query: {
      enabled: !!chainChaosAddress,
    },
  }) as { data: BetAutomationData | undefined; isLoading: boolean }

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-muted rounded w-32 mb-2"></div>
        <div className="h-3 bg-muted rounded w-24"></div>
      </div>
    )
  }

  if (!automationData?.isAutomated) {
    return (
      <Badge variant="outline" className="text-xs">
        <Bot className="h-3 w-3 mr-1" />
        Manual
      </Badge>
    )
  }

  const formatBlockHeight = (height: bigint) => {
    return height > 0 ? height.toString() : 'N/A'
  }

  const formatBlocksList = (blocks: bigint[]) => {
    if (blocks.length === 0) return 'All blocks in range'
    if (blocks.length <= 5) return blocks.map(b => b.toString()).join(', ')
    return `${blocks.slice(0, 3).map(b => b.toString()).join(', ')}... (+${blocks.length - 3} more)`
  }

  return (
    <div className="space-y-2">
      <Badge variant="secondary" className="text-xs">
        <Bot className="h-3 w-3 mr-1" />
        Automated
      </Badge>
      
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          {isOpen ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          <span>Automation Details</span>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-3 mt-2">
          <Card className="border-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Calculation Method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {automationData.calculationMethod}
              </p>
              
              <div className="grid grid-cols-1 gap-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Hash className="h-3 w-3" />
                    Start Block
                  </span>
                  <span className="font-mono">{formatBlockHeight(automationData.startBlockHeight)}</span>
                </div>
                
                {isSettled && automationData.endBlockHeight > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Hash className="h-3 w-3" />
                      End Block
                    </span>
                    <span className="font-mono">{formatBlockHeight(automationData.endBlockHeight)}</span>
                  </div>
                )}
                
                {isSettled && automationData.sampledBlocks.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Sampled Blocks:</div>
                    <div className="font-mono text-xs bg-muted/50 rounded p-2">
                      {formatBlocksList(automationData.sampledBlocks)}
                    </div>
                  </div>
                )}
                
                {isSettled && automationData.sampledBlocks.length === 0 && automationData.endBlockHeight > 0 && (
                  <div className="text-xs text-muted-foreground">
                    All blocks from {formatBlockHeight(automationData.startBlockHeight)} to {formatBlockHeight(automationData.endBlockHeight)} were used
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
} 