import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t bg-white/50 dark:bg-gray-950/50 backdrop-blur-sm mt-auto">
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          <p>🎲 ChainChaos - Bet on the heartbeat of Etherlink</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link href="/history" className="hover:text-foreground transition-colors">
            Betting History
          </Link>
        </div>
      </div>
    </div>
  </footer>
  )
} 