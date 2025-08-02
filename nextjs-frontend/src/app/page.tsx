'use client'

import { useActiveWalletChain } from 'thirdweb/react'
import { CurrentBet } from '@/components/bet-cards/CurrentBet'
import { 
  getChainChaosContract,
  defaultChain,
} from '@/lib/thirdweb'
import { WinnerNotifications } from '@/components/WinnerNotifications'
import { UnavailableChain } from '@/components/bet-cards/UnavailableChain'

export default function Home() {
  const activeChain = useActiveWalletChain()
  const chainId = activeChain?.id || defaultChain.id

  const contract = getChainChaosContract(chainId)

  return (
    <>
      <WinnerNotifications />
      {contract ? <CurrentBet /> : <UnavailableChain />}
    </>
  )
}
