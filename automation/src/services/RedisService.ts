import { createClient, RedisClientType } from 'redis';
import { Logger } from '../utils/Logger.js';

export interface WinnerNotification {
  betId: string;
  winnerAddress: string;
  betCategory: string;
  betDescription: string;
  prizeAmount: string;
  currencyType: number; // 0 = NATIVE, 1 = USDC
  settledAt: string;
  txHash?: string;
}

export class RedisService {
  private client: RedisClientType | null = null;
  private logger: Logger;
  private readonly WINNER_PREFIX: string;
  private readonly WINNER_COUNT_KEY: string;

  constructor() {
    this.logger = new Logger('RedisService');
    
    const IS_TESTNET = process.env.IS_TESTNET === 'true';
    const network = IS_TESTNET ? 'testnet' : 'mainnet';
    
    // Use different prefixes for testnet vs mainnet to avoid conflicts
    this.WINNER_PREFIX = `${network}:winner:`;
    this.WINNER_COUNT_KEY = `${network}:winner_count:`;
    
    this.logger.debug(`🔑 Redis configured for ${network} with prefix: ${network}:`);
  }

  async connect(): Promise<void> {
    if (this.client?.isOpen) return;

    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.client = createClient({ url: redisUrl });

      this.client.on('error', (err) => {
        this.logger.error('Redis Client Error:', err);
      });

      this.client.on('connect', () => {
        this.logger.debug('✅ Connected to Redis');
      });

      this.client.on('disconnect', () => {
        this.logger.warn('⚠️ Disconnected from Redis');
      });

      await this.client.connect();
      this.logger.info('✅ Redis service initialized');
    } catch (error) {
      this.logger.error('❌ Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client?.isOpen) {
      await this.client.disconnect();
      this.logger.info('👋 Disconnected from Redis');
    }
  }

  async addWinnerNotification(notification: WinnerNotification): Promise<void> {
    await this.ensureConnected();

    try {
      const key = `${this.WINNER_PREFIX}${notification.winnerAddress.toLowerCase()}:${notification.betId}`;
      const countKey = `${this.WINNER_COUNT_KEY}${notification.winnerAddress.toLowerCase()}`;
      
      // Store notification data
      await this.client!.hSet(key, {
        betId: notification.betId,
        winnerAddress: notification.winnerAddress.toLowerCase(),
        betCategory: notification.betCategory,
        betDescription: notification.betDescription,
        prizeAmount: notification.prizeAmount,
        currencyType: notification.currencyType.toString(),
        settledAt: notification.settledAt,
        txHash: notification.txHash || ''
      });

      // Set expiration (30 days)
      await this.client!.expire(key, 30 * 24 * 60 * 60);

      // Increment winner count for this address
      await this.client!.incr(countKey);
      await this.client!.expire(countKey, 30 * 24 * 60 * 60);

      this.logger.info(`📢 Added winner notification for ${notification.winnerAddress} - Bet ${notification.betId}`);
    } catch (error) {
      this.logger.error('Error adding winner notification:', error);
      throw error;
    }
  }

  async getWinnerNotifications(address: string): Promise<WinnerNotification[]> {
    await this.ensureConnected();

    try {
      const pattern = `${this.WINNER_PREFIX}${address.toLowerCase()}:*`;
      const keys = await this.client!.keys(pattern);
      
      if (keys.length === 0) {
        return [];
      }

      const notifications: WinnerNotification[] = [];
      
      for (const key of keys) {
        const data = await this.client!.hGetAll(key);
        if (Object.keys(data).length > 0) {
          notifications.push({
            betId: data.betId,
            winnerAddress: data.winnerAddress,
            betCategory: data.betCategory,
            betDescription: data.betDescription,
            prizeAmount: data.prizeAmount,
            currencyType: parseInt(data.currencyType),
            settledAt: data.settledAt,
            txHash: data.txHash || undefined
          });
        }
      }

      this.logger.debug(`📋 Retrieved ${notifications.length} notifications for ${address}`);
      return notifications;
    } catch (error) {
      this.logger.error('Error getting winner notifications:', error);
      throw error;
    }
  }

  async removeWinnerNotification(address: string, betId: string): Promise<void> {
    await this.ensureConnected();

    try {
      const key = `${this.WINNER_PREFIX}${address.toLowerCase()}:${betId}`;
      const countKey = `${this.WINNER_COUNT_KEY}${address.toLowerCase()}`;
      
      const existed = await this.client!.del(key);
      
      if (existed > 0) {
        // Decrement count
        const currentCount = await this.client!.get(countKey);
        if (currentCount && parseInt(currentCount) > 0) {
          await this.client!.decr(countKey);
        }
        
        this.logger.info(`🗑️ Removed winner notification for ${address} - Bet ${betId}`);
      }
    } catch (error) {
      this.logger.error('Error removing winner notification:', error);
      throw error;
    }
  }

  async getWinnerCount(address: string): Promise<number> {
    await this.ensureConnected();

    try {
      const countKey = `${this.WINNER_COUNT_KEY}${address.toLowerCase()}`;
      const count = await this.client!.get(countKey);
      return count ? parseInt(count) : 0;
    } catch (error) {
      this.logger.error('Error getting winner count:', error);
      return 0;
    }
  }

  async clearExpiredNotifications(): Promise<number> {
    await this.ensureConnected();

    try {
      const pattern = `${this.WINNER_PREFIX}*`;
      const keys = await this.client!.keys(pattern);
      let cleared = 0;

      for (const key of keys) {
        const ttl = await this.client!.ttl(key);
        if (ttl === -1) { // No expiration set
          await this.client!.expire(key, 30 * 24 * 60 * 60); // Set 30 days
        } else if (ttl === -2) { // Key doesn't exist (expired)
          cleared++;
        }
      }

      if (cleared > 0) {
        this.logger.info(`🧹 Cleared ${cleared} expired notifications`);
      }

      return cleared;
    } catch (error) {
      this.logger.error('Error clearing expired notifications:', error);
      return 0;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.ensureConnected();
      await this.client!.ping();
      return true;
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      return false;
    }
  }

  private async ensureConnected(): Promise<void> {
    if (!this.client?.isOpen) {
      await this.connect();
    }
  }
}