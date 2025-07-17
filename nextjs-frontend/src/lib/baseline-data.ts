// Helper function to make RPC calls
const makeRpcCall = async (chainId: number, method: string, params: any[] = []) => {
  const rpcUrls = {
    42793: 'https://node.mainnet.etherlink.com', // Etherlink Mainnet
    128123: 'https://node.ghostnet.etherlink.com', // Etherlink Testnet
  }
  
  const rpcUrl = rpcUrls[chainId as keyof typeof rpcUrls]
  if (!rpcUrl) throw new Error(`Unsupported chain ID: ${chainId}`)
  
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
      id: 1
    })
  })
  
  const data = await response.json()
  if (data.error) throw new Error(data.error.message)
  return data.result
}

// Helper to convert hex to decimal
const hexToDecimal = (hex: string): number => parseInt(hex, 16)

// Helper to convert wei to gwei
const weiToGwei = (wei: string): number => hexToDecimal(wei) / 1e9

// Fetch baseline data for different bet categories
export const fetchBaselineData = async (category: string, chainId: number): Promise<{
  value: string
  unit: string
  label: string
} | null> => {
  try {
    switch (category) {
      case 'gas_price': {
        const gasPrice = await makeRpcCall(chainId, 'eth_gasPrice')
        const gasPriceGwei = weiToGwei(gasPrice)
        return {
          value: gasPriceGwei.toFixed(2),
          unit: 'Gwei',
          label: 'Current Gas Price'
        }
      }

      case 'block_count': {
        const currentBlockHex = await makeRpcCall(chainId, 'eth_blockNumber')
        const currentBlock = hexToDecimal(currentBlockHex)
        const avgBlockTime = 15 // seconds (estimated for Etherlink)
        const expectedBlocks = Math.floor((10 * 60) / avgBlockTime) // 10 minutes
        return {
          value: expectedBlocks.toString(),
          unit: 'blocks',
          label: 'Expected Blocks (10min)'
        }
      }

      case 'transaction_count': {
        // Get recent block to estimate transaction volume
        const latestBlock = await makeRpcCall(chainId, 'eth_getBlockByNumber', ['latest', true])
        const txCount = latestBlock?.transactions?.length || 0
        const avgTxPerBlock = Math.max(txCount, 20) // At least 20 as baseline
        const expectedBlocks = Math.floor((10 * 60) / 15) // 10 min / 15 sec blocks
        const estimatedTxs = avgTxPerBlock * expectedBlocks
        
        return {
          value: estimatedTxs.toString(),
          unit: 'transactions',
          label: 'Estimated Transactions (10min)'
        }
      }

      case 'network_activity': {
        const block = await makeRpcCall(chainId, 'eth_getBlockByNumber', ['latest', false])
        const gasUsed = hexToDecimal(block.gasUsed)
        const gasLimit = hexToDecimal(block.gasLimit)
        const gasUsedRatio = gasUsed / gasLimit
        const activityScore = Math.floor(gasUsedRatio * 100)
        
        return {
          value: Math.max(1, Math.min(100, activityScore)).toString(),
          unit: 'score',
          label: 'Current Network Activity'
        }
      }

      case 'block_height': {
        const currentBlockHex = await makeRpcCall(chainId, 'eth_blockNumber')
        const currentBlock = hexToDecimal(currentBlockHex)
        const targetBlock = currentBlock + Math.floor((10 * 60) / 15) // +40 blocks in 10min
        
        return {
          value: targetBlock.toString(),
          unit: 'block',
          label: 'Target Block Height'
        }
      }

      default:
        return null
    }
  } catch (error) {
    console.error('Error fetching baseline data:', error)
    return null
  }
}

// Format category names for display
export const formatBetCategoryName = (category: string): string => {
  const categoryNames = {
    gas_price: 'Gas Price Prediction',
    block_count: 'Block Count Prediction', 
    transaction_count: 'Transaction Volume',
    network_activity: 'Network Activity Score',
    block_height: 'Block Height Prediction',
    xtz_price: 'XTZ Price Movement',
    etherlink_tps: 'Etherlink TPS'
  }
  
  return categoryNames[category as keyof typeof categoryNames] || 
         category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// Get helpful prediction hints
export const getPredictionHint = (category: string): string => {
  const hints = {
    gas_price: 'Gas prices fluctuate based on network congestion. Consider recent trends.',
    block_count: 'Etherlink averages ~15 second block times. Account for any network variations.',
    transaction_count: 'Transaction volume varies by time of day and network activity.',
    network_activity: 'Score based on gas usage ratio (0-100). Higher activity = higher score.',
    block_height: 'Predict the exact block number that will be reached.',
    xtz_price: 'Predict price movement in basis points over the next period.',
    etherlink_tps: 'Transactions per second can vary significantly with network load.'
  }
  
  return hints[category as keyof typeof hints] || 
         'Make your best prediction based on current network conditions.'
} 