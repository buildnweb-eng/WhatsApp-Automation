/**
 * Test the fixed catalog message
 * Run: bun run test-catalog-fix.ts
 */

import { whatsappService } from './src/services';

const TEST_PHONE = '916281432326'; // Your test number

async function testCatalogMessage() {
  console.log('🧪 Testing catalog message fix...\n');

  try {
    console.log('📤 Sending catalog instructions...');
    await whatsappService.sendCatalogMessage(TEST_PHONE);
    console.log('✅ Success! Check your WhatsApp for the message.\n');
    
    console.log('Expected message:');
    console.log('---');
    console.log('🛍️ *Browse Our Collection*');
    console.log('');
    console.log('To view our full catalog:');
    console.log('1. Tap the shopping bag icon (🛍️) at the bottom of this chat');
    console.log('2. Browse through our beautiful collection');
    console.log('3. Add items to your cart');
    console.log('4. Tap "Send" to share your cart with me');
    console.log('');
    console.log('_I\'ll help you complete your order!_ ✨');
    console.log('---\n');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run test
testCatalogMessage();
