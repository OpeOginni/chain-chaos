'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi'
import { parseEther, parseUnits } from 'viem'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ChainChaosABI } from '@/blockchain/ChainChaosABI'
import { 
  CurrencyType,
  getChainChaosAddress,
  areAddressesAvailable,
  isEtherlinkChain 
} from '@/lib/wagmi'
import { TokenIcon, getTokenSymbol } from '@/components/ui/TokenIcon'
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface CreateBetDialogProps {
  children: React.ReactNode
  onBetCreated?: () => void
}

export function CreateBetDialog({ children, onBetCreated }: CreateBetDialogProps) {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [currencyType, setCurrencyType] = useState<string>('')
  const [betAmount, setBetAmount] = useState('')

  const chainChaosAddress = getChainChaosAddress(chainId)
  const addressesAvailable = areAddressesAvailable(chainId)
  const isEtherlink = isEtherlinkChain(chainId)

  const { writeContract, data: hash, isPending, reset } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const isLoading = isPending || isConfirming

  // Handle transaction success
  useEffect(() => {
    if (isSuccess && hash) {
      toast.success('Bet created successfully!', {
        description: 'Your prediction market is now live and accepting bets.'
      })
      
      setOpen(false)
      setCategory('')
      setDescription('')
      setCurrencyType('')
      setBetAmount('')
      onBetCreated?.()
      reset() // Reset the transaction state
    }
  }, [isSuccess, hash, onBetCreated, reset])

  const handleCreateBet = async () => {
    if (!category || !description || !currencyType || !betAmount) {
      toast.error('Please fill in all fields')
      return
    }

    if (!chainChaosAddress || !addressesAvailable) {
      toast.error('Contract not available on this network')
      return
    }

    try {
      const currencyTypeNum = parseInt(currencyType) as CurrencyType
      let amount: bigint

      if (currencyTypeNum === CurrencyType.NATIVE) {
        amount = parseEther(betAmount)
      } else {
        amount = parseUnits(betAmount, 6) // USDC has 6 decimals
      }

      writeContract({
        address: chainChaosAddress,
        abi: ChainChaosABI,
        functionName: 'createBet',
        args: [category, description, currencyTypeNum, amount, BigInt(0), BigInt(0)],
      })
    } catch (error) {
      toast.error('Failed to create bet')
      console.error(error)
    }
  }

  const predefinedCategories = [
    { value: 'gas_price', label: 'Gas Price' },
    { value: 'block_height', label: 'Block Height' },
    { value: 'transaction_count', label: 'Transaction Count' },
    { value: 'xtz_price', label: 'XTZ Price' },
    { value: 'network_activity', label: 'Network Activity' },
    { value: 'etherlink_tps', label: 'Etherlink TPS' },
    { value: 'custom', label: 'Custom Category' },
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Bet</DialogTitle>
          <DialogDescription>
            Set up a new prediction market for users to bet on
          </DialogDescription>
        </DialogHeader>

        {/* Show availability warning if needed */}
        {!isEtherlink || !addressesAvailable ? (
          <Alert className="border-yellow-500/20 bg-yellow-500/5">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertDescription>
              {!isEtherlink 
                ? 'Please connect to an Etherlink network to create bets.'
                : 'Contract addresses are not configured for this network.'
              }
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {predefinedCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="What are users predicting?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={currencyType} onValueChange={setCurrencyType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CurrencyType.NATIVE.toString()}>
                    <div className="flex items-center gap-2">
                      <TokenIcon currencyType={CurrencyType.NATIVE} size={16} />
                      {getTokenSymbol(CurrencyType.NATIVE)} (XTZ)
                    </div>
                  </SelectItem>
                  <SelectItem value={CurrencyType.USDC.toString()}>
                    <div className="flex items-center gap-2">
                      <TokenIcon currencyType={CurrencyType.USDC} size={16} />
                      {getTokenSymbol(CurrencyType.USDC)} (USDC)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="amount">Bet Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.000001"
                placeholder="Minimum bet amount"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateBet}
            disabled={isLoading || !addressesAvailable || !isEtherlink}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isConfirming ? 'Confirming...' : 'Creating...'}
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Create Bet
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 