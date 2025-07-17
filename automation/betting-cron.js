/**
 * ChainChaos Betting Automation Script
 * 
 * This script runs every 10 minutes via FaaS (e.g., Vercel Functions, AWS Lambda)
 * to manage automated betting cycles on ChainChaos.
 * 
 * Flow:
 * 1. Check if current bet period has ended
 * 2. Fetch actual data for settlement
 * 3. Settle current bet
 * 4. Create next bet with new random category
 * 5. Schedule next execution
 */

const { ethers } = require('ethers')

// Configuration
const CHAIN_CONFIG = {
  // Etherlink Mainnet
  42793: {
    rpc: 'https://node.mainnet.etherlink.com',
    chainchaos: process.env.CHAINCHAOS_ADDRESS_MAINNET,
    usdc: process.env.USDC_ADDRESS_MAINNET,
    explorer: 'https://explorer.etherlink.com'
  },
  // Etherlink Testnet  
  128123: {
    rpc: 'https://node.ghostnet.etherlink.com',
    chainchaos: process.env.CHAINCHAOS_ADDRESS_TESTNET,
    usdc: process.env.USDC_ADDRESS_TESTNET,
    explorer: 'https://testnet.explorer.etherlink.com'
  }
}

// Prediction categories with data fetching functions
const BET_CATEGORIES = [
  {
    id: 'gas_price',
    name: 'Average Gas Price',
    description: 'Predict the average gas price in the next 10 minutes',
    unit: 'wei',
    currency: 0, // NATIVE
    amount: '0.1', // 0.1 XTZ
    fetchData: async (provider) => {
      // Get recent gas prices and calculate average
      const block = await provider.getBlock('latest')
      const feeData = await provider.getFeeData()
      return feeData.gasPrice.toString()
    }
  },
  {
    id: 'block_count',
    name: 'Blocks Mined',
    description: 'How many blocks will be mined in the next 10 minutes?',
    unit: 'blocks',
    currency: 1, // USDC
    amount: '1.0', // 1 USDC
    fetchData: async (provider) => {
      // Calculate expected blocks based on block time
      const currentBlock = await provider.getBlockNumber()
      const avgBlockTime = 15 // seconds (estimated for Etherlink)
      const expectedBlocks = Math.floor((10 * 60) / avgBlockTime)
      return expectedBlocks.toString()
    }
  },
  {
    id: 'transaction_count',
    name: 'Transaction Count',
    description: 'Predict transaction count in the next 10 minutes',
    unit: 'txs',
    currency: 1, // USDC
    amount: '2.0', // 2 USDC
    fetchData: async (provider) => {
      // Get recent transaction counts
      const latestBlock = await provider.getBlock('latest', true)
      const avgTxPerBlock = 50 // estimated
      const expectedBlocks = Math.floor((10 * 60) / 15) // 10 min / 15 sec blocks
      return (avgTxPerBlock * expectedBlocks).toString()
    }
  },
  {
    id: 'network_activity',
    name: 'Network Activity Score',
    description: 'Combined metric of network activity (0-100)',
    unit: 'score',
    currency: 0, // NATIVE
    amount: '0.05', // 0.05 XTZ
    fetchData: async (provider) => {
      // Simple activity score based on gas usage
      const block = await provider.getBlock('latest')
      const gasUsedRatio = Number(block.gasUsed) / Number(block.gasLimit)
      const activityScore = Math.floor(gasUsedRatio * 100)
      return Math.max(1, Math.min(100, activityScore)).toString()
    }
  }
]

// ABI for ChainChaos contract (simplified)
const CHAINCHAOS_ABI = [
  'function getCurrentBet() external view returns (uint256 id, string category, string description, uint8 currencyType, uint256 betAmount, uint256 actualValue, uint8 status, uint256 totalPot, bool refundMode, uint256 playerBetCount, uint256 createdAt, uint256 startTime, uint256 endTime)',
  'function isBettingActive() external view returns (bool)',
  'function settleBetAndCreateNext(uint256 actualValue, string nextCategory, string nextDescription, uint8 nextCurrencyType, uint256 nextBetAmount, uint256 nextStartTime, uint256 nextEndTime) external',
  'function createAutomatedBet(string category, string description, uint8 currencyType, uint256 betAmount, uint256 startTime, uint256 endTime) external returns (uint256)'
]

class BettingAutomation {
  constructor(chainId) {
    this.chainId = chainId
    this.config = CHAIN_CONFIG[chainId]
    this.provider = new ethers.JsonRpcProvider(this.config.rpc)
    this.wallet = new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY, this.provider)
    this.contract = new ethers.Contract(this.config.chainchaos, CHAINCHAOS_ABI, this.wallet)
  }

  // Main automation function
  async runCycle() {
    try {
      console.log(`[${new Date().toISOString()}] Starting betting cycle on chain ${this.chainId}`)

      // Check if there's a current bet
      let currentBet
      try {
        currentBet = await this.contract.getCurrentBet()
        console.log(`Current bet: #${currentBet.id} - ${currentBet.category}`)
      } catch (error) {
        console.log('No current bet found, creating first bet')
        return await this.createFirstBet()
      }

      // Check if betting period has ended
      const now = Math.floor(Date.now() / 1000)
      const endTime = Number(currentBet.endTime)

      if (now < endTime) {
        console.log(`Betting period active for ${endTime - now} more seconds`)
        return { success: true, message: 'Betting period still active' }
      }

      // Period has ended, settle and create next
      console.log('Betting period ended, settling bet...')
      
      // Get the category data fetcher
      const category = BET_CATEGORIES.find(c => c.id === currentBet.category)
      if (!category) {
        throw new Error(`Unknown category: ${currentBet.category}`)
      }

      // Fetch actual data
      const actualValue = await category.fetchData(this.provider)
      console.log(`Actual value for ${category.id}: ${actualValue}`)

      // Select next category randomly
      const nextCategory = this.selectRandomCategory()
      const nextStartTime = now + 60 // Start in 1 minute
      const nextEndTime = nextStartTime + (10 * 60) // 10 minutes duration
      const nextBetAmount = ethers.parseUnits(
        nextCategory.amount, 
        nextCategory.currency === 0 ? 18 : 6 // XTZ or USDC decimals
      )

      // Settle current bet and create next one
      const tx = await this.contract.settleBetAndCreateNext(
        actualValue,
        nextCategory.id,
        nextCategory.description,
        nextCategory.currency,
        nextBetAmount,
        nextStartTime,
        nextEndTime
      )

      console.log(`Transaction sent: ${tx.hash}`)
      const receipt = await tx.wait()
      console.log(`Transaction confirmed in block ${receipt.blockNumber}`)

      return {
        success: true,
        message: 'Bet settled and next bet created',
        txHash: tx.hash,
        settledBet: currentBet.id.toString(),
        nextCategory: nextCategory.id
      }

    } catch (error) {
      console.error('Automation error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Create the very first bet
  async createFirstBet() {
    const category = this.selectRandomCategory()
    const now = Math.floor(Date.now() / 1000)
    const startTime = now + 60 // Start in 1 minute
    const endTime = startTime + (10 * 60) // 10 minutes duration
    const betAmount = ethers.parseUnits(
      category.amount, 
      category.currency === 0 ? 18 : 6
    )

    const tx = await this.contract.createAutomatedBet(
      category.id,
      category.description,
      category.currency,
      betAmount,
      startTime,
      endTime
    )

    console.log(`First bet created: ${tx.hash}`)
    await tx.wait()

    return {
      success: true,
      message: 'First bet created',
      txHash: tx.hash,
      category: category.id
    }
  }

  // Randomly select next category
  selectRandomCategory() {
    return BET_CATEGORIES[Math.floor(Math.random() * BET_CATEGORIES.length)]
  }

  // Health check
  async healthCheck() {
    try {
      const blockNumber = await this.provider.getBlockNumber()
      const balance = await this.wallet.getBalance()
      
      return {
        healthy: true,
        blockNumber,
        oracleBalance: ethers.formatEther(balance),
        chainId: this.chainId
      }
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      }
    }
  }
}

// Main entry point for FaaS
async function handler(event, context) {
  const chainId = parseInt(process.env.CHAIN_ID || '128123') // Default to testnet
  
  // Handle different endpoints
  const path = event.path || event.rawPath || '/cycle'
  
  if (path === '/health') {
    const automation = new BettingAutomation(chainId)
    return {
      statusCode: 200,
      body: JSON.stringify(await automation.healthCheck())
    }
  }

  if (path === '/cycle') {
    const automation = new BettingAutomation(chainId)
    const result = await automation.runCycle()
    
    return {
      statusCode: result.success ? 200 : 500,
      body: JSON.stringify(result)
    }
  }

  return {
    statusCode: 404,
    body: JSON.stringify({ error: 'Endpoint not found' })
  }
}

// For local testing
if (require.main === module) {
  (async () => {
    const automation = new BettingAutomation(128123) // Testnet
    
    // Health check
    console.log('Health check:', await automation.healthCheck())
    
    // Run cycle
    console.log('Running cycle:', await automation.runCycle())
  })()
}

module.exports = { handler, BettingAutomation, BET_CATEGORIES } 