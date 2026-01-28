/**
 * Test the catalog message with a product thumbnail
 * Run: bun run test-catalog-with-product.ts
 */

import { whatsappService } from './src/services';

const TEST_PHONE = '916281432326'; // Your test number

// TODO: Replace with an actual product retailer ID from your catalog
// You can find this in Meta Commerce Manager > Catalog > Items
// It's displayed under each item's name
const PRODUCT_ID = 'YOUR_PRODUCT_ID_HERE';

async function testCatalogWithThumbnail() {
  console.log('🧪 Testing catalog message with product thumbnail...\n');

  // First, let's try without a thumbnail (will send instructions)
  console.log('📤 Test 1: Sending catalog instructions (no thumbnail)...');
  try {
    await whatsappService.sendCatalogMessage(TEST_PHONE);
    console.log('✅ Instructions sent!\n');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }

  // Wait 2 seconds
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Now try with a product thumbnail
  if (PRODUCT_ID !== 'YOUR_PRODUCT_ID_HERE') {
    console.log('📤 Test 2: Sending actual catalog message with thumbnail...');
    try {
      await whatsappService.sendCatalogMessage(
        TEST_PHONE,
        'Browse our beautiful saree collection! Tap to explore all items.',
        PRODUCT_ID
      );
      console.log('✅ Catalog message sent!\n');
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      if (error.response?.data) {
        console.error('API Error:', JSON.stringify(error.response.data, null, 2));
      }
    }
  } else {
    console.log('\n⚠️  To test the actual catalog message:');
    console.log('1. Go to https://business.facebook.com/commerce/');
    console.log('2. Select your business account');
    console.log('3. Click on your catalog');
    console.log('4. Go to Catalog > Items');
    console.log('5. Find any product and copy its ID (shown under the product name)');
    console.log('6. Edit this file and replace "YOUR_PRODUCT_ID_HERE" with that ID');
    console.log('7. Run this script again\n');
  }
}

// Run test
testCatalogWithThumbnail();
