import { BetHistory } from '@/components/BetHistory'
import { EtherlinkLogo } from '@/components/ui/EtherlinkLogo'
import { Gamepad2 } from 'lucide-react'
import { ConnectButton } from 'thirdweb/react'
import { client } from '@/lib/client'
import { supportedChains } from '@/lib/thirdweb'

export default function HistoryPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 flex flex-col">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/95 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Gamepad2 className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold gradient-text">ChainChaos</h1>
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-muted-foreground text-sm">powered by</span>
                <EtherlinkLogo size={20} />
              </div>
            </div>
            
            <div className="flex items-center gap-3">
            <div className="flex items-center gap-4">
                <ConnectButton
                  client={client}
                  chains={supportedChains}
                  appMetadata={{
                    name: "ChainChaos",
                    url: "https://chainchaos.com",
                    description: "A prediction market for Ethereum gas prices on Etherlink",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-1">
        <BetHistory />
      </main>
    </div>
  )
} 