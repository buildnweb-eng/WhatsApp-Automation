/**
 * Send Test WhatsApp Message
 * 
 * Even without full verification, you can send messages to test numbers
 */

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

// The recipient phone number (must be in international format without + sign)
const TO_PHONE = process.argv[2] || '916281432326'; // Your business phone from .env

async function sendTestMessage() {
  console.log('📱 Sending test WhatsApp message...\n');
  
  console.log('📋 Configuration:');
  console.log(`   From (Phone Number ID): ${PHONE_NUMBER_ID}`);
  console.log(`   To: +${TO_PHONE}`);
  console.log(`   Access Token: ${ACCESS_TOKEN?.substring(0, 20)}...\n`);

  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.error('❌ Error: Missing credentials in .env file');
    process.exit(1);
  }

  try {
    const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;
    
    console.log('📡 Making API request to:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: TO_PHONE,
        type: 'template',
        template: {
          name: 'hello_world',
          language: {
            code: 'en_US'
          }
        }
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('\n❌ Message failed!');
      console.error('Status:', response.status, response.statusText);
      console.error('Error:', JSON.stringify(data, null, 2));
      
      if (data.error?.code === 131026) {
        console.error('\n💡 Tip: This number might not be registered as a test recipient.');
        console.error('Add it in Meta Developer Portal → WhatsApp → API Setup → Step 3: Add recipient phone number');
      }
      
      if (data.error?.error_subcode === 2388115) {
        console.error('\n💡 Tip: Phone number needs to complete business verification first.');
        console.error('You can still test with verified test numbers in the meantime.');
      }
      
      process.exit(1);
    }

    console.log('\n✅ Message sent successfully!');
    console.log('Response:', JSON.stringify(data, null, 2));
    console.log('\n🎉 Check your WhatsApp to see the message!');
    console.log(`📱 Message ID: ${data.messages?.[0]?.id || 'N/A'}\n`);

  } catch (error) {
    console.error('\n❌ Error sending message:');
    console.error(error);
    process.exit(1);
  }
}

sendTestMessage();
