import { ethers } from 'ethers';
import { Logger } from '../utils/Logger.js';
import { BlockchainDataService } from './BlockchainDataService.js';
import { ContractService } from './ContractService.js';
import { RedisService, WinnerNotification } from './RedisService.js';

export interface BetCategory {
  category: string;
  description: string;
  calculationMethod: string;
  requiresSampling: boolean;
}

export interface CalculationResult {
  value: number;
  sampledBlocks: number[];
  details: string;
}

export class AutomationService {
  private logger: Logger;
  private blockchainService: BlockchainDataService;
  private contractService: ContractService;
  private redisService: RedisService;

  // Bet categories with their descriptions and calculation methods
  private readonly BET_CATEGORIES: BetCategory[] = [
    {
      category: 'base_fee_per_gas',
      description: 'Average base fee per gas over next 5 minutes',
      calculationMethod: 'Average of base_fee_per_gas from all blocks in the range',
      requiresSampling: false
    },
    {
      category: 'burnt_fees',
      description: 'Total burnt fees in randomly sampled blocks over next 5 minutes',
      calculationMethod: 'Sum burnt_fees from 40-60 randomly sampled blocks',
      requiresSampling: true
    },
    {
      category: 'gas_used',
      description: 'Total gas used in randomly sampled blocks over next 5 minutes', 
      calculationMethod: 'Sum gas_used from 40-60 randomly sampled blocks',
      requiresSampling: true
    },
    {
      category: 'xtz_price',
      description: 'XTZ price in USD cents at the end of 5 minutes',
      calculationMethod: 'Fetch XTZ price from CoinGecko API and multiply by 100',
      requiresSampling: false
    }
  ];

  constructor() {
    this.logger = new Logger('AutomationService');
    this.blockchainService = new BlockchainDataService();
    this.contractService = new ContractService();
    this.redisService = new RedisService();
  }

  async healthCheck(): Promise<void> {
    this.logger.info('🔍 Running health check...');
    
    // Check blockchain connection
    await this.blockchainService.getLatestBlock();
    this.logger.debug('✅ Blockchain data service OK');
    
    // Check contract connection
    await this.contractService.healthCheck();
    this.logger.debug('✅ Contract service OK');
    
    // Check Redis connection
    const redisHealthy = await this.redisService.healthCheck();
    if (redisHealthy) {
      this.logger.debug('✅ Redis service OK');
    } else {
      this.logger.warn('⚠️ Redis service unavailable - notifications disabled');
    }
    
    this.logger.info('✅ All services healthy');
  }

  async runCycle(): Promise<void> {
    try {
      this.logger.info('🤖 Starting automated betting cycle...');

      const currentBlockHeight = await this.blockchainService.getCurrentBlockHeight();
      this.logger.info(`📊 Current block height: ${currentBlockHeight}`);

      // Step 1: Settle any expired automated bets
      await this.settleExpiredBets(currentBlockHeight);

      // Step 2: Create a new automated bet
      await this.createNewAutomatedBet(currentBlockHeight);

      // Step 3: Clean up expired notifications
      await this.cleanupExpiredNotifications();

      this.logger.info('✅ Automation cycle completed successfully');

    } catch (error) {
      this.logger.error('❌ Automation cycle failed:', error);
      throw error;
    }
  }

  private async settleExpiredBets(currentBlockHeight: number): Promise<void> {
    this.logger.info('⏰ Checking for expired bets to settle...');

    const activeBetIds = await this.contractService.getActiveBets();
    this.logger.info(`📊 Found ${activeBetIds.length} active bets`);

    for (const betId of activeBetIds) {
      try {
        const betInfo = await this.contractService.getBetInfo(betId);
        const automationData = await this.contractService.getBetAutomationData(betId);
        
        // Check if this is an automated bet and if it's time to settle
        const isAutomated = automationData[4];
        const endTime = Number(betInfo[12]); // endTime is at index 12, not 13
        const isExpired = endTime > 0 && Date.now() / 1000 >= endTime;

        if (isAutomated && isExpired) {
          this.logger.info(`⏰ Settling expired bet ${betId}...`);
          
          try {
            const startBlockHeight = Number(automationData[0]);
            const category = betInfo[1];
            
            // Calculate how many blocks should have passed (roughly 1 block per 15 seconds)
            const expectedBlocks = Math.floor(5 * 60 / 15); // 5 minutes / 15 seconds per block
            const endBlockHeight = Math.min(startBlockHeight + expectedBlocks, currentBlockHeight);
            
            const result = await this.calculateResult(category, startBlockHeight, endBlockHeight);
            
            this.logger.info(`📈 Calculated result for ${category}: ${result.value}`);
            this.logger.debug(`🔍 Details: ${result.details}`);
            
            // Settle the bet
            const txHash = await this.contractService.settleAutomatedBet(
              betId,
              result.value,
              endBlockHeight,
              result.sampledBlocks,
              result.details
            );
            
            this.logger.info(`✅ Bet ${betId} settled successfully`);

            // Track winners in Redis for notifications
            await this.trackWinners(betId, betInfo, txHash);
          } catch (settlementError) {
            this.logger.error(`❌ Failed to settle bet ${betId}, attempting to cancel:`, settlementError);
            
            try {
              const cancelTxHash = await this.contractService.cancelBet(betId);
              this.logger.info(`🚫 Bet ${betId} cancelled due to settlement failure - TX: ${cancelTxHash}`);
              
              // Optionally track the cancellation for notifications
              await this.trackCancellation(betId, betInfo, cancelTxHash);
            } catch (cancelError) {
              this.logger.error(`❌ Failed to cancel bet ${betId} after settlement failure:`, cancelError);
              // At this point, manual intervention may be required
              throw new Error(`Critical: Could not settle or cancel bet ${betId}. Manual intervention required.`);
            }
          }
        }
      } catch (error) {
        this.logger.error(`❌ Error settling bet ${betId}:`, error);
      }
    }
  }

  private async trackWinners(betId: bigint, betInfo: any, txHash: string): Promise<void> {
    try {
      // Get winner indices using the dedicated function
      const winnerIndices = await this.contractService.getBetWinnerIndices(betId);
      
      if (!winnerIndices || winnerIndices.length === 0) {
        this.logger.info(`📊 No winners found for bet ${betId}`);
        return;
      }

      // Get all player bets to find winner addresses
      const playerBets = await this.contractService.getPlayerBets(betId);
      const totalPot = Number(betInfo[7]);
      const currencyType = Number(betInfo[3]);
      
      // Calculate prize per winner (minus 5% fee)
      const prizePool = totalPot - (totalPot * 5) / 100;
      const prizePerWinner = prizePool / winnerIndices.length;

      for (const winnerIndex of winnerIndices) {
        const winnerPlayerBet = playerBets[Number(winnerIndex)];
        if (winnerPlayerBet) {
          const notification: WinnerNotification = {
            betId: betId.toString(),
            winnerAddress: winnerPlayerBet[0], // player address
            betCategory: betInfo[1], // category
            betDescription: betInfo[2], // description
            prizeAmount: prizePerWinner.toString(),
            currencyType: currencyType,
            settledAt: new Date().toISOString(),
            txHash: txHash
          };

          await this.redisService.addWinnerNotification(notification);
        }
      }

      this.logger.info(`🏆 Tracked ${winnerIndices.length} winners for bet ${betId}`);
    } catch (error) {
      this.logger.error(`❌ Error tracking winners for bet ${betId}:`, error);
      // Don't throw - this is not critical for the main automation flow
    }
  }

  private async trackCancellation(betId: bigint, betInfo: any, txHash: string): Promise<void> {
    try {
      // Get all player bets to notify participants about cancellation
      const playerBets = await this.contractService.getPlayerBets(betId);
      const totalPot = Number(betInfo[7]);
      const currencyType = Number(betInfo[3]);
      const betAmount = Number(betInfo[4]);

      for (const playerBet of playerBets) {
        const notification: WinnerNotification = {
          betId: betId.toString(),
          winnerAddress: playerBet[0], // player address
          betCategory: betInfo[1], // category
          betDescription: `CANCELLED: ${betInfo[2]}`, // mark as cancelled
          prizeAmount: betAmount.toString(), // refund amount
          currencyType: currencyType,
          settledAt: new Date().toISOString(),
          txHash: txHash
        };

        await this.redisService.addWinnerNotification(notification);
      }

      this.logger.info(`🚫 Tracked cancellation for ${playerBets.length} players in bet ${betId}`);
    } catch (error) {
      this.logger.error(`❌ Error tracking cancellation for bet ${betId}:`, error);
      // Don't throw - this is not critical for the main automation flow
    }
  }

  private async cleanupExpiredNotifications(): Promise<void> {
    try {
      // Clean up notifications older than 24 hours
      const cleared = await this.redisService.clearExpiredNotifications();
      if (cleared > 0) {
        this.logger.info(`🧹 Cleaned up ${cleared} expired notifications`);
      }
    } catch (error) {
      this.logger.error('❌ Error cleaning up notifications:', error);
    }
  }

  /**
   * Startup recovery: Check current bet status and calculate next cycle timing
   */
  async startupRecovery(): Promise<{ nextCycleDelay: number; shouldRunImmediately: boolean }> {
    this.logger.info('🔄 Running startup recovery check...');
    
    try {
      const activeBets = await this.contractService.getActiveBets();
      this.logger.info(`📊 Found ${activeBets.length} active bets`);

      if (activeBets.length === 0) {
        this.logger.info('🆕 No active bets found - will create new bet immediately');
        return { nextCycleDelay: 0, shouldRunImmediately: true };
      }

      // Find the most recent automated bet
      let mostRecentBet = null;
      let mostRecentEndTime = 0;

      for (const betId of activeBets) {
        try {
          const betInfo = await this.contractService.getBetInfo(betId);
          const automationData = await this.contractService.getBetAutomationData(betId);
          
          if (automationData[4] && Number(betInfo[12]) > mostRecentEndTime) {
            mostRecentBet = { betId, betInfo, automationData };
            mostRecentEndTime = Number(betInfo[12]);
          }
        } catch (error) {
          this.logger.warn(`⚠️ Could not get info for bet ${betId}:`, error);
        }
      }

      if (!mostRecentBet) {
        this.logger.info('🆕 No automated bets found - will create new bet immediately');
        return { nextCycleDelay: 0, shouldRunImmediately: true };
      }

      const now = Math.floor(Date.now() / 1000);
      const endTime = Number(mostRecentBet.betInfo[12]); // endTime is at index 12
      
      this.logger.info(`⏰ Most recent automated bet ${mostRecentBet.betId} ends at ${new Date(endTime * 1000).toISOString()}`);

      if (now >= endTime) {
        // Bet has expired - settle it and create new one immediately
        this.logger.info('⏳ Current bet has expired - will settle and create new bet immediately');
        return { nextCycleDelay: 0, shouldRunImmediately: true };
      } else {
        // Bet is still active - calculate when next cycle should start
        const timeUntilEnd = endTime - now;
        const nextCycleDelay = Math.max(0, timeUntilEnd * 1000); // Convert to milliseconds
        
        this.logger.info(`⏱️ Current bet still active for ${Math.ceil(timeUntilEnd / 60)} minutes`);
        this.logger.info(`🎯 Next cycle will start in ${Math.ceil(nextCycleDelay / 60000)} minutes`);
        
        return { nextCycleDelay, shouldRunImmediately: false };
      }

    } catch (error) {
      this.logger.error('❌ Error during startup recovery:', error);
      this.logger.info('🔄 Falling back to immediate cycle start');
      return { nextCycleDelay: 0, shouldRunImmediately: true };
    }
  }

  /**
   * Schedule the next cycle based on recovery timing
   */
  scheduleNextCycle(callback: () => Promise<void>, delayMs: number = 0): NodeJS.Timeout {
    if (delayMs <= 0) {
      this.logger.info('🚀 Scheduling immediate cycle execution');
      return setTimeout(callback, 100); // Small delay to allow logging
    }

    const minutes = Math.ceil(delayMs / 60000);
    this.logger.info(`⏰ Scheduling next cycle in ${minutes} minutes`);
    return setTimeout(callback, delayMs);
  }

  private async createNewAutomatedBet(currentBlockHeight: number): Promise<void> {
    this.logger.info('🎲 Creating new automated bet...');
    
    const selectedCategory = this.pickRandom(this.BET_CATEGORIES);
    const now = Math.floor(Date.now() / 1000);
    const endTime = now + (5 * 60); // 5 minutes from now
    
    // Default bet parameters
    const currencyType = Math.random() < 0.5 ? 0 : 1; // Randomly choose NATIVE (0) or USDC (1)
    let betAmount: bigint;

    if (currencyType === 0) { // NATIVE (XTZ)
      betAmount = ethers.parseEther('0.1'); // 0.1 XTZ
    } else { // USDC
      betAmount = ethers.parseUnits('1', 6); // 1 USDC (6 decimals)
    }
    
    const txHash = await this.contractService.createAutomatedBet(
      selectedCategory.category,
      selectedCategory.description,
      currencyType,
      betAmount,
      now,
      endTime,
      currentBlockHeight,
      selectedCategory.calculationMethod
    );
    
    this.logger.info(`🎯 New automated bet created: ${selectedCategory.category}`);
    this.logger.info(`📦 Transaction: ${txHash}`);
    this.logger.info(`⏰ Bet will end at: ${new Date(endTime * 1000).toISOString()}`);
  }

  private async calculateResult(
    category: string,
    startBlock: number,
    endBlock: number
  ): Promise<CalculationResult> {
    this.logger.info(`🧮 Calculating result for ${category} from blocks ${startBlock} to ${endBlock}`);

    switch (category) {
      case 'base_fee_per_gas':
        return await this.calculateBaseFeeAverage(startBlock, endBlock);
      
      case 'burnt_fees':
        return await this.calculateSampledSum(category, startBlock, endBlock);
      
      case 'gas_used':
        return await this.calculateSampledSum(category, startBlock, endBlock);
      
      case 'xtz_price':
        return await this.calculateXTZPrice();
      
      default:
        throw new Error(`Unknown category: ${category}`);
    }
  }

  private async calculateBaseFeeAverage(startBlock: number, endBlock: number): Promise<CalculationResult> {
    let totalBaseFee = 0;
    let blockCount = 0;
    
    try {
      const blocks = await this.blockchainService.getBlockRange(startBlock, endBlock);
      
      for (const block of blocks) {
        if (block && block.base_fee_per_gas) {
          totalBaseFee += parseInt(block.base_fee_per_gas);
          blockCount++;
        }
      }
      
      // Fill in any gaps if the range fetch was incomplete
      if (blockCount < (endBlock - startBlock + 1)) {
        const fetchedHeights = new Set(blocks.map(b => b ? parseInt(b.height) : 0));
        for (let i = startBlock; i <= endBlock; i++) {
          if (!fetchedHeights.has(i)) {
            try {
              const block = await this.blockchainService.getBlock(i);
              if (block && block.base_fee_per_gas) {
                totalBaseFee += parseInt(block.base_fee_per_gas);
                blockCount++;
              }
            } catch (e) {
              this.logger.warn(`Could not fetch block ${i} to fill gap.`);
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to fetch block range for base fee average: ${error}`);
      // Fallback to individual fetching if range fails
      for (let i = startBlock; i <= endBlock; i++) {
        try {
          const block = await this.blockchainService.getBlock(i);
          if (block && block.base_fee_per_gas) {
            totalBaseFee += parseInt(block.base_fee_per_gas);
            blockCount++;
          }
        } catch (e) {
          this.logger.warn(`Could not fetch block ${i} for averaging.`);
        }
      }
    }

    if (blockCount === 0) {
      return { value: 0, sampledBlocks: [], details: "No blocks found in range to calculate average base fee." };
    }

    const averageBaseFee = Math.round(totalBaseFee / blockCount);
    const details = `Calculated average base fee from ${blockCount} blocks between ${startBlock} and ${endBlock}.`;
    
    return { value: averageBaseFee, sampledBlocks: [], details };
  }

  private async calculateSampledSum(category: string, startBlock: number, endBlock: number): Promise<CalculationResult> {
    const totalBlocks = endBlock - startBlock + 1;
    const sampleSize = Math.min(this.getRandomSampleSize(), totalBlocks);
    const allBlocks = Array.from({ length: totalBlocks }, (_, i) => startBlock + i);
    const sampledBlockHeights = this.shuffleArray(allBlocks).slice(0, sampleSize);
    
    let value = 0;
    const details = `Summed ${category} from ${sampledBlockHeights.length} randomly sampled blocks: [${sampledBlockHeights.slice(0, 5).join(', ')}${sampledBlockHeights.length > 5 ? '...' : ''}]`;
    
    try {
      // First try to get blocks from the range API
      const rangeBlocks = await this.blockchainService.getBlockRange(startBlock, endBlock);
      const blockMap = new Map(rangeBlocks.map(block => [parseInt(block.height), block]));
      
      for (const height of sampledBlockHeights) {
        try {
          let block = blockMap.get(height);
          
          // If block not in range, fetch individually
          if (!block) {
            block = await this.blockchainService.getBlock(height);
          }
          
          const fieldValue = parseInt(block[category] || '0');
          value += fieldValue;
        } catch (error) {
          this.logger.warn(`Error fetching block ${height}:`, error);
        }
      }
    } catch (error) {
      // Fallback to individual requests
      this.logger.warn('Sampled block fetch failed, falling back to individual requests:', error);
      
      for (const height of sampledBlockHeights) {
        try {
          const block = await this.blockchainService.getBlock(height);
          const fieldValue = parseInt(block[category] || '0');
          value += fieldValue;
        } catch (error) {
          this.logger.warn(`Error fetching block ${height}:`, error);
        }
      }
    }
    
    return { value, sampledBlocks: sampledBlockHeights, details };
  }

  private async calculateXTZPrice(): Promise<CalculationResult> {
    const priceUSD = await this.blockchainService.getXTZPrice();
    const value = Math.floor(priceUSD * 100); // Convert to cents
    const details = `XTZ price fetched from CoinGecko API at settlement time: $${priceUSD.toFixed(2)} (${value} cents)`;
    
    return { value, sampledBlocks: [], details };
  }

  // Utility functions
  private pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private getRandomSampleSize(): number {
    return Math.floor(Math.random() * 21) + 40; // 40-60 blocks
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
} 
