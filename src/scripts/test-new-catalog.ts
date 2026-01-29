/**
 * Test the new catalog message with product ID
 * Run: bun run test-new-catalog.ts
 */

import { whatsappService } from './src/services';

const TEST_PHONE = '916281432326'; // Your test number

async function testNewCatalogMessage() {
  console.log('🧪 Testing NEW catalog message with product ID...\n');

  try {
    console.log('📤 Sending interactive catalog message...');
    console.log('   Product: Classic Red & Gold Traditional Silk Saree');
    console.log('   Product ID: k30xdslu41\n');
    
    await whatsappService.sendCatalogMessage(
      TEST_PHONE,
      'Browse our beautiful saree collection! 🛍️ Tap below to explore all items.',
      'k30xdslu41'  // Classic Red & Gold Traditional Silk Saree
    );
    
    console.log('✅ SUCCESS! Check your WhatsApp now!');
    console.log('\n📱 You should see:');
    console.log('   ┌─────────────────────────────────┐');
    console.log('   │  🛍️ Catalog Message             │');
    console.log('   │                                 │');
    console.log('   │  [Product Image]                │');
    console.log('   │  Browse our beautiful saree...  │');
    console.log('   │                                 │');
    console.log('   │  [View Catalog Button] ← Tap!  │');
    console.log('   └─────────────────────────────────┘');
    console.log('\n✨ This is a clickable catalog message!');
    console.log('   Tapping it will open your FULL catalog with all 7 products!');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run test
testNewCatalogMessage();
