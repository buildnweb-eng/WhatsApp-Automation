/**
 * Test sending a reply message
 * Usage: bun run test-send-reply.ts <phone_number>
 */

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

const TO_PHONE = process.argv[2];

if (!TO_PHONE) {
  console.error('❌ Please provide a phone number');
  console.error('Usage: bun run test-send-reply.ts 919876543210');
  process.exit(1);
}

async function sendReply() {
  console.log('📱 Sending test reply...\n');
  console.log(`   To: +${TO_PHONE}\n`);

  try {
    const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;
    
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
          body: '👋 Welcome to BuildNweb!\n\n🛍️ Browse our products:\n1. Premium Sarees\n2. Designer Collections\n3. Traditional Wear\n\nReply with a number to see products!'
        }
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('\n❌ Message failed!');
      console.error('Error:', JSON.stringify(data, null, 2));
      
      if (data.error?.code === 131047) {
        console.error('\n💡 Note: You can only send messages to users who have messaged you first (within 24 hours)');
        console.error('This is a WhatsApp Business API restriction.');
        console.error('\nSolution: Have the user send a message to your business number first!');
      }
      
      process.exit(1);
    }

    console.log('\n✅ Message sent successfully!');
    console.log('Message ID:', data.messages?.[0]?.id || 'N/A');
    console.log('\n🎉 Check WhatsApp to see the message!\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

sendReply();
