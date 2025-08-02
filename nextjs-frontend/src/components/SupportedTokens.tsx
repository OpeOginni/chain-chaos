'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent} from '@/components/ui/card'
import { CurrencyType } from '@/lib/types'
import { TokenIcon } from '@/components/ui/TokenIcon'

export function SupportedTokens() {
  const tokens = [
    {
      type: CurrencyType.XTZ,
      symbol: 'XTZ',
      name: 'Tezos',
      description: 'Native blockchain currency'
    },
    {
      type: CurrencyType.USDC,
      symbol: 'USDC',
      name: 'USD Coin',
      description: 'Stable cryptocurrency'
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
      {tokens.map((token) => (
        <Card key={token.symbol} className="bet-card">
          <CardContent className="p-4 text-center space-y-3">
            <TokenIcon currencyType={token.type} size={32} className="mx-auto" />
            <div>
              <div className="font-semibold flex items-center justify-center gap-1">
                {token.symbol}
                <Badge variant="secondary" className="text-xs">
                  {token.name}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{token.description}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 