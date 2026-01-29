/**
 * Send Text WhatsApp Message
 */

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

// The recipient phone number (must be in international format without + sign)
const TO_PHONE = process.argv[2] || '916281432326';

async function sendTextMessage() {
  console.log('📱 Sending text WhatsApp message...\n');
  
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
        recipient_type: 'individual',
        to: TO_PHONE,
        type: 'text',
        text: {
          preview_url: false,
          body: '🎉 Hello! This is a test message from your WhatsApp Cloud API automation! Your setup is working perfectly! ✅'
        }
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('\n❌ Message failed!');
      console.error('Status:', response.status, response.statusText);
      console.error('Error:', JSON.stringify(data, null, 2));
      
      if (data.error?.code === 131047) {
        console.error('\n💡 Tip: You can only send messages to users who have messaged you first (within 24 hours)');
        console.error('OR use approved message templates for business-initiated conversations.');
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

sendTextMessage();
