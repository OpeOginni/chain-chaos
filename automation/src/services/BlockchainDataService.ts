import { Logger } from '../utils/Logger.js';

export class BlockchainDataService {
  private logger: Logger;
  private readonly BLOCKS_API: string;
  private readonly PRICE_API = 'https://api.coingecko.com/api/v3/simple/price?ids=tezos&vs_currencies=usd';

  constructor() {
    this.logger = new Logger('BlockchainDataService');
    
    const IS_TESTNET = process.env.IS_TESTNET === 'true';
    this.BLOCKS_API = IS_TESTNET 
      ? 'https://testnet.explorer.etherlink.com/api/v2/blocks'
      : 'https://explorer.etherlink.com/api/v2/blocks';
    
    const network = IS_TESTNET ? 'testnet' : 'mainnet';
    this.logger.debug(`🌍 Blockchain service configured for ${network}`);
    this.logger.debug(`📡 Blocks API: ${this.BLOCKS_API}`);
  }

  async getBlock(height: number): Promise<any> {
    const blockUrl = `${this.BLOCKS_API}/${height}`;
    this.logger.debug(`Fetching block ${height} from ${blockUrl}`);

    try {
      const response = await fetch(blockUrl);

      if (!response.ok) {
        // If the block is not found, the API might return a 404 or other error
        if (response.status === 404) {
          this.logger.warn(`Block ${height} not found.`);
          // As a fallback, we can fetch the latest block, but this should be used cautiously.
          // For now, we'll throw an error to make it clear the requested block is unavailable.
          throw new Error(`Block ${height} not found.`);
        }
        throw new Error(`Failed to fetch block ${height}: ${response.statusText}`);
      }
      
      const blockData = await response.json();
      return blockData;

    } catch (error) {
      this.logger.error(`Error fetching block ${height}:`, error);
      // Fallback to latest block is risky for settlement, so we'll re-throw.
      throw error;
    }
  }

  async getLatestBlocks(limit: number = 50): Promise<any[]> {
    try {
      const response = await fetch(`${this.BLOCKS_API}?type=block&limit=${limit}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch latest blocks: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.items || [];
    } catch (error) {
      this.logger.error('Error fetching latest blocks:', error);
      throw error;
    }
  }

  async getLatestBlock(): Promise<any> {
    const blocks = await this.getLatestBlocks(1);
    if (blocks.length === 0) {
      throw new Error('No blocks available');
    }
    return blocks[0];
  }

  async getCurrentBlockHeight(): Promise<number> {
    const latestBlock = await this.getLatestBlock();
    return parseInt(latestBlock.height);
  }

  async getBlockRange(startHeight: number, endHeight: number): Promise<any[]> {
    this.logger.debug(`Fetching block range from ${startHeight} to ${endHeight}`);
    const blockPromises: Promise<any>[] = [];

    for (let height = startHeight; height <= endHeight; height++) {
      blockPromises.push(this.getBlock(height));
    }

    try {
      const blocks = await Promise.all(blockPromises);
      // Filter out any null responses if getBlock is modified to return null on error
      const validBlocks = blocks.filter(block => block !== null);
      
      this.logger.debug(`Successfully fetched ${validBlocks.length} blocks in range ${startHeight}-${endHeight}`);
      return validBlocks;
    } catch (error) {
      this.logger.error(`Error fetching block range ${startHeight}-${endHeight}:`, error);
      // Depending on requirements, you might want to return partial data
      // or throw the error. For settlement, throwing is safer.
      throw error;
    }
  }

  async getXTZPrice(): Promise<number> {
    try {
      const response = await fetch(this.PRICE_API);
      if (!response.ok) {
        throw new Error(`Failed to fetch XTZ price: ${response.statusText}`);
      }
      const data = await response.json();
      return data.tezos.usd;
    } catch (error) {
      this.logger.error('Error fetching XTZ price:', error);
      throw error;
    }
  }
} 