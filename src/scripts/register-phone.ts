/**
 * WhatsApp Phone Number Registration Script
 * 
 * This script registers your business phone number with WhatsApp Cloud API
 * and enables two-step verification.
 * 
 * Run this once after adding a new phone number to your WhatsApp Business Account.
 */

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

// YOU NEED TO SET THIS: Your 6-digit PIN for two-step verification
const TWO_STEP_PIN = process.env.WHATSAPP_TWO_STEP_PIN || 'YOUR_6_DIGIT_PIN';

/**
 * Register phone number with WhatsApp Cloud API
 */
async function registerPhoneNumber() {
  console.log('🚀 Starting phone number registration...\n');
  
  console.log('📋 Configuration:');
  console.log(`   Phone Number ID: ${PHONE_NUMBER_ID}`);
  console.log(`   Access Token: ${ACCESS_TOKEN?.substring(0, 20)}...`);
  console.log(`   Two-Step PIN: ${'*'.repeat(TWO_STEP_PIN.length)}\n`);

  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.error('❌ Error: Missing PHONE_NUMBER_ID or ACCESS_TOKEN in .env file');
    process.exit(1);
  }

  if (TWO_STEP_PIN === 'YOUR_6_DIGIT_PIN' || TWO_STEP_PIN.length !== 6) {
    console.error('❌ Error: Please set a valid 6-digit PIN');
    console.error('   Set WHATSAPP_TWO_STEP_PIN in your .env file or pass it as argument');
    process.exit(1);
  }

  try {
    const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/register`;
    
    console.log('📡 Making API request to:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        pin: TWO_STEP_PIN,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('\n❌ Registration failed!');
      console.error('Status:', response.status, response.statusText);
      console.error('Error:', JSON.stringify(data, null, 2));
      
      if (data.error?.code === 133016) {
        console.error('\n⚠️  Rate limit exceeded!');
        console.error('You have made too many registration requests in the last 72 hours.');
        console.error('Please wait before trying again.');
      }
      
      process.exit(1);
    }

    console.log('\n✅ Phone number registered successfully!');
    console.log('Response:', JSON.stringify(data, null, 2));
    
    console.log('\n🎉 Success! Your phone number is now registered with WhatsApp Cloud API.');
    console.log('📱 Two-step verification has been enabled with your PIN.');
    console.log('\n📋 Next steps:');
    console.log('   1. Set up webhook to receive messages');
    console.log('   2. Test sending a message');
    console.log('   3. Start building your automation!\n');

  } catch (error) {
    console.error('\n❌ Error during registration:');
    console.error(error);
    process.exit(1);
  }
}

// Run the registration
registerPhoneNumber();
