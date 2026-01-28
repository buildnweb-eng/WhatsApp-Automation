/**
 * Check WhatsApp Commerce Settings
 * This will show if your catalog is properly connected and visible to customers
 * Run: bun run check-commerce-settings.ts
 */

import axios from 'axios';
import { config } from './src/config/env';

const PHONE_NUMBER_ID = config.whatsapp.phoneNumberId;
const ACCESS_TOKEN = config.whatsapp.accessToken;
const CATALOG_ID = config.whatsapp.catalogId;
const API_VERSION = 'v18.0';

async function checkCommerceSettings() {
  console.log('🔍 Checking WhatsApp Commerce Settings...\n');
  console.log('Phone Number ID:', PHONE_NUMBER_ID);
  console.log('Catalog ID:', CATALOG_ID);
  console.log('─'.repeat(60), '\n');

  try {
    // Check phone number settings
    console.log('📞 Fetching phone number settings...');
    const response = await axios.get(
      `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}`,
      {
        params: {
          fields: [
            'id',
            'verified_name',
            'display_phone_number',
            'quality_rating',
            'account_mode',
            'is_official_business_account',
            'code_verification_status'
          ].join(','),
          access_token: ACCESS_TOKEN
        }
      }
    );

    const settings = response.data;
    console.log('\n✅ Phone Number Settings Retrieved:\n');
    console.log('  Verified Name:', settings.verified_name || 'Not set');
    console.log('  Display Number:', settings.display_phone_number);
    console.log('  Quality Rating:', settings.quality_rating || 'Unknown');
    console.log('  Account Mode:', settings.account_mode || 'Unknown');
    console.log('  Official Business:', settings.is_official_business_account ? 'Yes' : 'No');
    console.log('  Verification Status:', settings.code_verification_status);

    // Try to check if catalog is connected
    console.log('\n─'.repeat(60));
    console.log('\n📦 Checking Catalog Connection...');
    
    try {
      const catalogResponse = await axios.get(
        `https://graph.facebook.com/${API_VERSION}/${CATALOG_ID}`,
        {
          params: {
            fields: 'id,name,vertical,product_count',
            access_token: ACCESS_TOKEN
          }
        }
      );

      const catalog = catalogResponse.data;
      console.log('\n✅ Catalog Found:\n');
      console.log('  Catalog ID:', catalog.id);
      console.log('  Catalog Name:', catalog.name || 'Not set');
      console.log('  Vertical:', catalog.vertical || 'Not set');
      console.log('  Product Count:', catalog.product_count || 'Unknown');

      // Try to fetch some products
      console.log('\n─'.repeat(60));
      console.log('\n🛍️  Fetching Products from Catalog...');
      
      const productsResponse = await axios.get(
        `https://graph.facebook.com/${API_VERSION}/${CATALOG_ID}/products`,
        {
          params: {
            fields: 'id,name,description,price,availability,retailer_id,image_url',
            limit: 5,
            access_token: ACCESS_TOKEN
          }
        }
      );

      const products = productsResponse.data.data;
      console.log(`\n✅ Found ${products.length} products (showing first 5):\n`);
      
      products.forEach((product: any, index: number) => {
        console.log(`  ${index + 1}. ${product.name || 'Unnamed'}`);
        console.log(`     ID: ${product.id}`);
        console.log(`     Retailer ID: ${product.retailer_id || 'Not set'}`);
        console.log(`     Price: ${product.price || 'Not set'}`);
        console.log(`     Available: ${product.availability || 'Unknown'}`);
        console.log(`     Image: ${product.image_url ? 'Yes' : 'No'}`);
        console.log('');
      });

      if (products.length > 0) {
        console.log('─'.repeat(60));
        console.log('\n🎯 You can use this product ID for catalog messages:');
        console.log(`   ${products[0].retailer_id || products[0].id}`);
        console.log('\n💡 Update your code to use this product ID:');
        console.log(`   await whatsappService.sendCatalogMessage(`);
        console.log(`     phoneNumber,`);
        console.log(`     'Browse our collection!',`);
        console.log(`     '${products[0].retailer_id || products[0].id}'  // Use this!`);
        console.log(`   );`);
      } else {
        console.log('\n⚠️  WARNING: No products found in catalog!');
        console.log('   Add products in Meta Commerce Manager:');
        console.log('   https://business.facebook.com/commerce/');
      }

    } catch (catalogError: any) {
      console.log('\n❌ Error accessing catalog:');
      console.log('   ', catalogError.response?.data?.error?.message || catalogError.message);
      console.log('\n   This might mean:');
      console.log('   1. The catalog ID is incorrect');
      console.log('   2. The access token doesn\'t have permission to access the catalog');
      console.log('   3. The catalog is not connected to this WhatsApp Business Account');
    }

    // Summary
    console.log('\n' + '─'.repeat(60));
    console.log('\n📊 SUMMARY:\n');
    
    if (products && products.length > 0) {
      console.log('✅ Catalog has products!');
      console.log('\n🤔 If customers still can\'t see the shopping bag icon:');
      console.log('   1. Connect catalog in Meta Business Manager (see instructions above)');
      console.log('   2. Wait 24 hours for changes to propagate');
      console.log('   3. Ensure products are published (not draft)');
      console.log('   4. Use the product ID shown above to send catalog messages');
    } else {
      console.log('⚠️  No products found in catalog');
      console.log('   Add products in Meta Commerce Manager');
    }

  } catch (error: any) {
    console.error('\n❌ Error checking settings:');
    if (error.response?.data?.error) {
      console.error('   ', error.response.data.error.message);
      console.error('   Error Code:', error.response.data.error.code);
      console.error('   Error Type:', error.response.data.error.type);
    } else {
      console.error('   ', error.message);
    }
  }
}

// Run the check
checkCommerceSettings();
