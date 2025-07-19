#!/usr/bin/env node

// Simple test script to verify Etherlink API endpoints
import https from 'https';

async function testAPI(url, description) {
  console.log(`\n🧪 Testing: ${description}`);
  console.log(`📡 URL: ${url}`);
  
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log(`✅ Status: ${res.statusCode}`);
          console.log(`📊 Items count: ${parsed.items ? parsed.items.length : 'N/A'}`);
          
          if (parsed.items && parsed.items.length > 0) {
            const firstBlock = parsed.items[0];
            console.log(`🔢 Latest block height: ${firstBlock.height}`);
            console.log(`⛽ Gas used: ${firstBlock.gas_used}`);
            console.log(`💸 Burnt fees: ${firstBlock.burnt_fees}`);
            console.log(`📈 Base fee per gas: ${firstBlock.base_fee_per_gas}`);
          }
          
          resolve(parsed);
        } catch (error) {
          console.log(`❌ JSON Parse Error:`, error.message);
          console.log(`📄 Raw response:`, data.substring(0, 200) + '...');
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`❌ Request Error:`, error.message);
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      console.log(`⏰ Request timeout`);
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function testPriceAPI() {
  console.log(`\n🧪 Testing: XTZ Price API`);
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=tezos&vs_currencies=usd';
  console.log(`📡 URL: ${url}`);
  
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log(`✅ Status: ${res.statusCode}`);
          console.log(`💰 XTZ Price: $${parsed.tezos?.usd || 'N/A'}`);
          resolve(parsed);
        } catch (error) {
          console.log(`❌ JSON Parse Error:`, error.message);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`❌ Request Error:`, error.message);
      reject(error);
    });
  });
}

async function main() {
  console.log('🚀 Chain Chaos API Test Suite');
  console.log('================================');
  
  try {
    // Test mainnet API
    await testAPI(
      'https://explorer.etherlink.com/api/v2/blocks?type=block&limit=5',
      'Etherlink Mainnet Blocks API'
    );
    
    // Test testnet API  
    await testAPI(
      'https://testnet.explorer.etherlink.com/api/v2/blocks?type=block&limit=5',
      'Etherlink Testnet Blocks API'
    );
    
    // Test price API
    await testPriceAPI();
    
    console.log('\n🎉 All API tests completed!');
    console.log('\n💡 Tips:');
    console.log('- Make sure to use the correct block heights in your range calculations');
    console.log('- The APIs return blocks in descending order (newest first)');
    console.log('- Consider the block time (~15 seconds) when calculating ranges');
    
  } catch (error) {
    console.log('\n💥 Test failed:', error.message);
    process.exit(1);
  }
}

main(); 