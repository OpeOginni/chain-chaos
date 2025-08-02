import { BetHistory } from '@/components/history/BetHistory'
import { History, Home } from 'lucide-react'
import { ConnectButton } from 'thirdweb/react'
import { Button } from '@/components/ui/button'
import { client } from '@/lib/client'
import { supportedChains } from '@/lib/thirdweb'
import Link from 'next/link'

export default function HistoryPage() {
  return (
    <BetHistory />
  )
} 