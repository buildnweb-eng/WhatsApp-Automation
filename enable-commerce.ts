/**
 * Enable Commerce Settings for WhatsApp
 * This will enable the shopping cart feature and connect your catalog
 * Run: bun run enable-commerce.ts
 */

import axios from 'axios';
import { config } from './src/config/env';

const PHONE_NUMBER_ID = config.whatsapp.phoneNumberId;
const ACCESS_TOKEN = config.whatsapp.accessToken;
const CATALOG_ID = config.whatsapp.catalogId;
const WABA_ID = config.whatsapp.businessAccountId;
const API_VERSION = 'v18.0';

async function enableCommerce() {
  console.log('🛠️  Enabling WhatsApp Commerce Settings...\n');
  console.log('Phone Number ID:', PHONE_NUMBER_ID);
  console.log('WABA ID:', WABA_ID);
  console.log('Catalog ID:', CATALOG_ID);
  console.log('─'.repeat(60), '\n');

  try {
    // Method 1: Try to enable commerce via WhatsApp Business Account
    console.log('📝 Attempting to enable commerce via WABA...');
    
    try {
      const wabaResponse = await axios.post(
        `https://graph.facebook.com/${API_VERSION}/${WABA_ID}/subscribed_apps`,
        null,
        {
          params: {
            access_token: ACCESS_TOKEN
          }
        }
      );
      console.log('✅ WABA subscription verified');
    } catch (e: any) {
      console.log('⚠️  WABA subscription:', e.response?.data?.error?.message || 'Already subscribed');
    }

    // Method 2: Try to enable shopping cart on phone number
    console.log('\n📝 Enabling shopping cart on phone number...');
    
    try {
      const cartResponse = await axios.post(
        `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}`,
        {
          shopping_cart_enabled: true
        },
        {
          params: {
            access_token: ACCESS_TOKEN
          }
        }
      );
      console.log('✅ Shopping cart enabled:', cartResponse.data);
    } catch (e: any) {
      const errorMsg = e.response?.data?.error?.message || e.message;
      if (errorMsg.includes('already enabled') || errorMsg.includes('permission')) {
        console.log('ℹ️  Shopping cart status:', errorMsg);
      } else {
        console.log('⚠️  Could not enable via API:', errorMsg);
      }
    }

    // Method 3: Try to set commerce settings
    console.log('\n📝 Setting commerce configuration...');
    
    try {
      const settingsResponse = await axios.post(
        `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/whatsapp_commerce_settings`,
        {
          is_cart_enabled: true,
          is_catalog_visible: true
        },
        {
          params: {
            access_token: ACCESS_TOKEN
          }
        }
      );
      console.log('✅ Commerce settings updated:', settingsResponse.data);
    } catch (e: any) {
      const errorMsg = e.response?.data?.error?.message || e.message;
      console.log('ℹ️  Commerce settings:', errorMsg);
    }

    // Verify the changes
    console.log('\n─'.repeat(60));
    console.log('\n🔍 Verifying commerce status...\n');
    
    const verifyResponse = await axios.get(
      `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}`,
      {
        params: {
          fields: 'shopping_cart_enabled,verified_name,display_phone_number',
          access_token: ACCESS_TOKEN
        }
      }
    );

    console.log('📊 Current Status:');
    console.log('  Phone:', verifyResponse.data.display_phone_number);
    console.log('  Business Name:', verifyResponse.data.verified_name || 'Not set');
    console.log('  Shopping Cart:', verifyResponse.data.shopping_cart_enabled ? '✅ ENABLED' : '❌ DISABLED');

    // Final instructions
    console.log('\n' + '─'.repeat(60));
    console.log('\n📋 NEXT STEPS:\n');

    if (verifyResponse.data.shopping_cart_enabled) {
      console.log('✅ Commerce is enabled! But you still need to:');
      console.log('\n1. Connect catalog in Meta Business Manager:');
      console.log('   → Go to: https://business.facebook.com/settings/');
      console.log('   → Click: WhatsApp Accounts → Your Account → WhatsApp Manager');
      console.log('   → Click: Catalogue (in left menu)');
      console.log('   → Click: "Choose a Catalogue" and select your catalog');
      console.log('   → Click: Connect');
      console.log('\n2. Wait 24 hours for changes to propagate');
      console.log('\n3. Test with: bun run check-commerce-settings.ts');
    } else {
      console.log('⚠️  Commerce could not be enabled via API.');
      console.log('\n🔧 Manual Setup Required:');
      console.log('\n1. Go to Meta Business Manager:');
      console.log('   https://business.facebook.com/settings/');
      console.log('\n2. Navigate to:');
      console.log('   WhatsApp Accounts → Select your account → WhatsApp Manager');
      console.log('\n3. Find your phone number and click Settings');
      console.log('\n4. Look for "Commerce" or "Shopping" section');
      console.log('\n5. Enable commerce and connect your catalog');
      console.log('\n6. In "Catalogue" section:');
      console.log('   → Choose your catalog (ID: ' + CATALOG_ID + ')');
      console.log('   → Click Connect');
      console.log('\n7. Make sure catalog has at least 1 published product');
      console.log('\n8. Wait 24 hours for changes to take effect');
    }

    console.log('\n💡 Alternative: Send catalog message with product ID');
    console.log('   Run: bun run check-commerce-settings.ts');
    console.log('   (will show you a product ID to use)');

  } catch (error: any) {
    console.error('\n❌ Error enabling commerce:');
    if (error.response?.data?.error) {
      console.error('   ', error.response.data.error.message);
      console.error('   Error Code:', error.response.data.error.code);
      console.error('   Error Type:', error.response.data.error.type);
      
      if (error.response.data.error.code === 200) {
        console.log('\n💡 This usually means you need to configure commerce in Meta Business Manager manually.');
        console.log('   Go to: https://business.facebook.com/settings/');
      }
    } else {
      console.error('   ', error.message);
    }
  }
}

// Run the enablement
enableCommerce();
