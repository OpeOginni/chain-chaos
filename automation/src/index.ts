import dotenv from 'dotenv';
import { AutomationService } from './services/AutomationService.js';
import { Logger } from './utils/Logger.js';

// Load environment variables
dotenv.config();

const logger = new Logger('Main');

async function main() {
  try {
    logger.info('🤖 Starting Chain Chaos Automation Service...');
    
    // Validate environment variables
    const IS_TESTNET = process.env.IS_TESTNET === 'true';
    const network = IS_TESTNET ? 'testnet' : 'mainnet';
    
    logger.info(`🌍 Network: ${network.toUpperCase()}`);
    
    const requiredEnvs = ['AUTOMATION_PRIVATE_KEY'];
    const contractAddressVar = IS_TESTNET 
      ? 'CHAIN_CHAOS_TESTNET_CONTRACT_ADDRESS' 
      : 'CHAIN_CHAOS_CONTRACT_ADDRESS';
    
    requiredEnvs.push(contractAddressVar);
    
    const missing = requiredEnvs.filter(env => !process.env[env]);
    
    if (missing.length > 0) {
      logger.error(`❌ Missing required environment variables for ${network}: ${missing.join(', ')}`);
      process.exit(1);
    }

    // Log network configuration
    const rpcUrl = IS_TESTNET 
      ? (process.env.ETHERLINK_TESTNET_RPC_URL || 'https://node.ghostnet.etherlink.com')
      : (process.env.ETHERLINK_RPC_URL || 'https://node.mainnet.etherlink.com');
    
    logger.info(`📡 RPC URL: ${rpcUrl}`);
    logger.info(`📄 Contract: ${process.env[contractAddressVar]}`);

    const automationService = new AutomationService();
    
    // Test the service first
    logger.info('🧪 Testing automation service...');
    await automationService.healthCheck();
    logger.info('✅ Service health check passed');

    // Run startup recovery to determine timing
    logger.info('🔄 Running startup recovery...');
    const recovery = await automationService.startupRecovery();

    let scheduledTimeout: NodeJS.Timeout | null = null;

    // Function to run automation cycle and schedule the next one
    const runCycleAndScheduleNext = async () => {
      try {
        logger.info('🎯 Running automation cycle...');
        await automationService.runCycle();
        logger.info('✅ Automation cycle completed');
        
        // Schedule next cycle in exactly 5 minutes (300,000 ms)
        const nextCycleDelay = 5 * 60 * 1000;
        scheduledTimeout = automationService.scheduleNextCycle(runCycleAndScheduleNext, nextCycleDelay);
        
      } catch (error) {
        logger.error('❌ Automation cycle failed:', error);
        // Retry in 1 minute on failure
        logger.info('🔄 Retrying in 1 minute...');
        scheduledTimeout = automationService.scheduleNextCycle(runCycleAndScheduleNext, 60 * 1000);
      }
    };

    // Handle --run-now flag (immediate execution regardless of recovery)
    if (process.argv.includes('--run-now')) {
      logger.info('🚀 Running immediate automation cycle due to --run-now flag...');
      scheduledTimeout = automationService.scheduleNextCycle(runCycleAndScheduleNext, 0);
    } else if (recovery.shouldRunImmediately) {
      // Start immediately based on recovery analysis
      logger.info('🚀 Starting immediate cycle based on recovery analysis...');
      scheduledTimeout = automationService.scheduleNextCycle(runCycleAndScheduleNext, 0);
    } else {
      // Schedule first cycle based on recovery timing
      logger.info(`⏰ Scheduling first cycle based on existing bet timing...`);
      scheduledTimeout = automationService.scheduleNextCycle(runCycleAndScheduleNext, recovery.nextCycleDelay);
    }

    logger.info('🎲 Chain Chaos Automation Service is running!');
    
    // Keep the process alive and handle shutdown
    process.on('SIGINT', () => {
      logger.info('👋 Shutting down automation service...');
      if (scheduledTimeout) {
        clearTimeout(scheduledTimeout);
        logger.info('⏹️ Cancelled scheduled automation cycle');
      }
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      logger.info('👋 Received SIGTERM, shutting down automation service...');
      if (scheduledTimeout) {
        clearTimeout(scheduledTimeout);
        logger.info('⏹️ Cancelled scheduled automation cycle');
      }
      process.exit(0);
    });

  } catch (error) {
    logger.error('💥 Failed to start automation service:', error);
    process.exit(1);
  }
}

main(); 