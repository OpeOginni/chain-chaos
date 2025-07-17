'use client'

import { BetHistory } from '@/components/BetHistory'
import { Button } from '@/components/ui/button'
import { EtherlinkLogo } from '@/components/ui/EtherlinkLogo'
import { ArrowLeft, Gamepad2 } from 'lucide-react'

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
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/'}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-1">
        <BetHistory />
      </main>

      {/* Footer */}
      <footer className="border-t border-border/20 bg-muted/5">
        <div className="container mx-auto px-4 py-8">


          {/* Bottom Section */}
          <div className="border-t border-border/20 mt-8 pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                © 2024 ChainChaos. Built with ❤️ on Etherlink.
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>v1.0.0</span>
                <span>•</span>
                <span>History Portal</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
} 