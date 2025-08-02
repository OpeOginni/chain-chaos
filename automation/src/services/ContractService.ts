import { ethers } from 'ethers';
import { Logger } from '../utils/Logger.js';

export class ContractService {
  private logger: Logger;
  private contract: ethers.Contract | null = null;
  private provider: ethers.JsonRpcProvider | null = null;

  // Contract ABI (only the functions we need)
  private readonly CONTRACT_ABI = [
    'function createAutomatedBet(string category, string description, uint8 currencyType, uint256 betAmount, uint256 startTime, uint256 endTime, uint256 startBlockHeight, string calculationMethod) external returns (uint256)',
    'function settleAutomatedBet(uint256 betId, uint256 actualValue, uint256 endBlockHeight, uint256[] sampledBlocks, string calculationDetails) external',
    'function getActiveBets() external view returns (uint256[])',
    'function getBetInfo(uint256 betId) external view returns (uint256 id, string category, string description, uint8 currencyType, uint256 betAmount, uint256 actualValue, uint8 status, uint256 totalPot, bool refundMode, uint256 playerBetCount, uint256 createdAt, uint256 startTime, uint256 endTime)',
    'function getBetWinnerIndices(uint256 betId) external view returns (uint256[] memory)',
    'function getBetAutomationData(uint256 betId) external view returns (uint256 startBlockHeight, uint256 endBlockHeight, uint256[] sampledBlocks, string calculationMethod, bool isAutomated)',
    'function getBetPlayerBets(uint256 betId) external view returns (tuple(address player, uint256 guess, bool claimed)[])'
  ];

  constructor() {
    this.logger = new Logger('ContractService');
  }

  private async initializeContract(): Promise<void> {
    if (this.contract) return;

    const IS_TESTNET = process.env.IS_TESTNET === 'true';
    const ETHERLINK_RPC = IS_TESTNET 
      ? (process.env.ETHERLINK_TESTNET_RPC_URL || 'https://node.ghostnet.etherlink.com')
      : (process.env.ETHERLINK_RPC_URL || 'https://node.mainnet.etherlink.com');
    
    const PRIVATE_KEY = process.env.AUTOMATION_PRIVATE_KEY;
    const CONTRACT_ADDRESS = IS_TESTNET 
      ? process.env.CHAIN_CHAOS_TESTNET_CONTRACT_ADDRESS
      : process.env.CHAIN_CHAOS_CONTRACT_ADDRESS;

    if (!PRIVATE_KEY || !CONTRACT_ADDRESS) {
      const network = IS_TESTNET ? 'testnet' : 'mainnet';
      throw new Error(`Missing required environment variables for ${network}: AUTOMATION_PRIVATE_KEY or CHAIN_CHAOS_${IS_TESTNET ? 'TESTNET_' : ''}CONTRACT_ADDRESS`);
    }

    this.provider = new ethers.JsonRpcProvider(ETHERLINK_RPC);
    const wallet = new ethers.Wallet(PRIVATE_KEY, this.provider);
    this.contract = new ethers.Contract(CONTRACT_ADDRESS, this.CONTRACT_ABI, wallet);

    const network = IS_TESTNET ? 'testnet' : 'mainnet';
    this.logger.debug(`✅ Contract service initialized for ${network}`);
    this.logger.debug(`📍 RPC: ${ETHERLINK_RPC}`);
    this.logger.debug(`📄 Contract: ${CONTRACT_ADDRESS}`);
  }

  async healthCheck(): Promise<void> {
    await this.initializeContract();
    
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    // Try to call a simple read function
    try {
      await this.contract.getActiveBets();
      this.logger.debug('✅ Contract connection healthy');
    } catch (error) {
      this.logger.error('❌ Contract health check failed:', error);
      throw error;
    }
  }

  async getActiveBets(): Promise<bigint[]> {
    await this.initializeContract();
    
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const activeBets = await this.contract.getActiveBets();
      return activeBets;
    } catch (error) {
      this.logger.error('Error getting active bets:', error);
      throw error;
    }
  }

  async getBetInfo(betId: bigint): Promise<any> {
    await this.initializeContract();
    
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const betInfo = await this.contract.getBetInfo(betId);
      return betInfo;
    } catch (error) {
      this.logger.error(`Error getting bet info for ${betId}:`, error);
      throw error;
    }
  }

  async getBetAutomationData(betId: bigint): Promise<any> {
    await this.initializeContract();
    
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const automationData = await this.contract.getBetAutomationData(betId);
      return automationData;
    } catch (error) {
      this.logger.error(`Error getting automation data for ${betId}:`, error);
      throw error;
    }
  }

  async getPlayerBets(betId: bigint): Promise<any[]> {
    await this.initializeContract();
    
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const playerBets = await this.contract.getBetPlayerBets(betId);
      return playerBets;
    } catch (error) {
      this.logger.error(`Error getting player bets for ${betId}:`, error);
      throw error;
    }
  }

  async createAutomatedBet(
    category: string,
    description: string,
    currencyType: number,
    betAmount: bigint,
    startTime: number,
    endTime: number,
    startBlockHeight: number,
    calculationMethod: string
  ): Promise<string> {
    await this.initializeContract();
    
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const tx = await this.contract.createAutomatedBet(
        category,
        description,
        currencyType,
        betAmount,
        startTime,
        endTime,
        startBlockHeight,
        calculationMethod
      );
      
      const receipt = await tx.wait();
      this.logger.info(`✅ Created automated bet - TX: ${receipt.hash}`);
      return receipt.hash;
    } catch (error) {
      this.logger.error('Error creating automated bet:', error);
      throw error;
    }
  }

  async settleAutomatedBet(
    betId: bigint,
    actualValue: bigint,
    endBlockHeight: number,
    sampledBlocks: number[],
    calculationDetails: string
  ): Promise<string> {
    await this.initializeContract();
    
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const tx = await this.contract.settleAutomatedBet(
        betId,
        actualValue,
        endBlockHeight,
        sampledBlocks,
        calculationDetails
      );
      
      const receipt = await tx.wait();
      this.logger.info(`✅ Settled automated bet ${betId} - TX: ${receipt.hash}`);
      return receipt.hash;
    } catch (error) {
      this.logger.error(`Error settling automated bet ${betId}:`, error);
      throw error;
    }
  }

  async cancelBet(betId: bigint): Promise<string> {
    await this.initializeContract();
    
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const tx = await this.contract.cancelBet(betId);
      const receipt = await tx.wait();
      this.logger.info(`🚫 Cancelled bet ${betId} - TX: ${receipt.hash}`);
      return receipt.hash;
    } catch (error) {
      this.logger.error(`Error cancelling bet ${betId}:`, error);
      throw error;
    }
  }

  async getBetWinnerIndices(betId: bigint): Promise<bigint[]> {
    await this.initializeContract();
    
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const winnerIndices = await this.contract.getBetWinnerIndices(betId);
      return winnerIndices;
    } catch (error) {
      this.logger.error(`Error getting winner indices for ${betId}:`, error);
      throw error;
    }
  }
} 