/**
 * Subscribe app to WhatsApp Business Account webhooks
 */

const WABA_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

async function subscribeWebhook() {
  console.log('🔔 Subscribing app to webhook events...\n');
  
  console.log('📋 Configuration:');
  console.log(`   WABA ID: ${WABA_ID}`);
  console.log(`   Access Token: ${ACCESS_TOKEN?.substring(0, 20)}...\n`);

  try {
    const url = `https://graph.facebook.com/v21.0/${WABA_ID}/subscribed_apps`;
    
    console.log('📡 Making API request to:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('\n❌ Subscription failed!');
      console.error('Status:', response.status, response.statusText);
      console.error('Error:', JSON.stringify(data, null, 2));
      
      if (data.error?.message?.includes('permissions')) {
        console.error('\n💡 Tip: Make sure your access token has the following permissions:');
        console.error('   - whatsapp_business_messaging');
        console.error('   - whatsapp_business_management');
      }
      
      process.exit(1);
    }

    console.log('\n✅ Successfully subscribed to webhook events!');
    console.log('Response:', JSON.stringify(data, null, 2));
    
    console.log('\n🎉 Your app is now subscribed to receive WhatsApp messages!');
    console.log('📱 Try sending a message to your business number now.\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

subscribeWebhook();
