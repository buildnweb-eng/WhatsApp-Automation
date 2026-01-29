/**
 * Check webhook subscription status
 */

const WABA_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

async function checkWebhookSubscription() {
  console.log('🔍 Checking webhook subscription status...\n');

  try {
    // Check subscribed apps
    const url = `https://graph.facebook.com/v21.0/${WABA_ID}/subscribed_apps`;
    
    console.log('📡 Making API request to:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('\n❌ Request failed!');
      console.error('Error:', JSON.stringify(data, null, 2));
      process.exit(1);
    }

    console.log('\n✅ Webhook subscription status:');
    console.log(JSON.stringify(data, null, 2));

    if (data.data && data.data.length > 0) {
      console.log('\n📋 Subscribed apps:');
      data.data.forEach((app: any) => {
        console.log(`   App ID: ${app.id}`);
        console.log(`   Subscribed fields: ${app.subscribed_fields?.join(', ') || 'None'}`);
      });
    } else {
      console.log('\n⚠️  No apps are subscribed to this WABA!');
      console.log('You need to subscribe your app to receive webhook events.');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

checkWebhookSubscription();
