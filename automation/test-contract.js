import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

async function testContract() {
  const IS_TESTNET = process.env.IS_TESTNET === 'true';
  const contractAddressVar = IS_TESTNET 
    ? 'CHAIN_CHAOS_TESTNET_CONTRACT_ADDRESS' 
    : 'CHAIN_CHAOS_CONTRACT_ADDRESS';
  
  const contractAddress = process.env[contractAddressVar];
  const rpcUrl = IS_TESTNET 
    ? (process.env.ETHERLINK_TESTNET_RPC_URL || 'https://node.ghostnet.etherlink.com')
    : (process.env.ETHERLINK_RPC_URL || 'https://node.mainnet.etherlink.com');

  console.log(`🌍 Network: ${IS_TESTNET ? 'TESTNET' : 'MAINNET'}`);
  console.log(`📡 RPC URL: ${rpcUrl}`);
  console.log(`📄 Contract: ${contractAddress}`);

  if (!contractAddress) {
    console.error('❌ Contract address not found');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);

  // Test different ABI versions to see which one works
  const testABIs = [
    // Current ABI (individual return values)
    {
      name: 'Individual Returns',
      abi: ['function getBetInfo(uint256 betId) external view returns (uint256 id, string category, string description, uint8 currencyType, uint256 betAmount, uint256 actualValue, uint8 status, uint256 totalPot, bool refundMode, uint256 playerBetCount, uint256 createdAt, uint256 startTime, uint256 endTime)']
    },
    // Old ABI (tuple return)
    {
      name: 'Tuple Return',
      abi: ['function getBetInfo(uint256 betId) external view returns (tuple(uint256 id, string category, string description, uint8 currencyType, uint256 betAmount, uint256 actualValue, uint8 status, uint256 totalPot, bool refundMode, uint256 playerBetCount, uint256 createdAt, uint256 startTime, uint256 endTime))']
    },
    // Simple ABI for debugging
    {
      name: 'Raw Call',
      abi: ['function getBetInfo(uint256 betId) external view returns (bytes)']
    }
  ];

  // First, let's get active bets to test with
  const basicContract = new ethers.Contract(contractAddress, [
    'function getActiveBets() external view returns (uint256[])'
  ], provider);

  try {
    console.log('\n🔍 Getting active bets...');
    const activeBets = await basicContract.getActiveBets();
    console.log(`📊 Found ${activeBets.length} active bets:`, activeBets.map(b => b.toString()));

    if (activeBets.length === 0) {
      console.log('ℹ️ No active bets to test with');
      return;
    }

    const testBetId = activeBets[0];
    console.log(`\n🧪 Testing with bet ID: ${testBetId}`);

    // Test each ABI version
    for (const { name, abi } of testABIs) {
      console.log(`\n--- Testing ${name} ---`);
      
      try {
        const contract = new ethers.Contract(contractAddress, abi, provider);
        const result = await contract.getBetInfo(testBetId);
        
        console.log(`✅ ${name} SUCCESS:`, result);
        
        if (Array.isArray(result)) {
          console.log(`📋 Array length: ${result.length}`);
          result.forEach((item, i) => {
            console.log(`  [${i}]: ${item} (${typeof item})`);
          });
        }
        
      } catch (error) {
        console.log(`❌ ${name} FAILED:`, error.message);
      }
    }

    // Test raw contract call to see the actual data
    console.log('\n--- Raw Contract Call ---');
    try {
      const iface = new ethers.Interface(['function getBetInfo(uint256 betId)']);
      const data = iface.encodeFunctionData('getBetInfo', [testBetId]);
      
      console.log(`📤 Call data: ${data}`);
      
      const rawResult = await provider.call({
        to: contractAddress,
        data: data
      });
      
      console.log(`📥 Raw result: ${rawResult}`);
      console.log(`📏 Raw result length: ${rawResult.length}`);
      
      // Try to decode manually
      try {
        const decoded = ethers.AbiCoder.defaultAbiCoder().decode([
          'uint256', 'string', 'string', 'uint8', 'uint256', 'uint256', 'uint8', 'uint256', 'bool', 'uint256', 'uint256', 'uint256', 'uint256'
        ], rawResult);
        console.log('✅ Manual decode SUCCESS:', decoded);
      } catch (decodeError) {
        console.log('❌ Manual decode FAILED:', decodeError.message);
      }
      
    } catch (error) {
      console.log('❌ Raw call FAILED:', error.message);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testContract().catch(console.error); 