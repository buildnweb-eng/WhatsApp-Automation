/**
 * Test webhook by simulating a WhatsApp message
 */

const WEBHOOK_URL = 'https://commerce-radios-framework-bare.trycloudflare.com/webhook/whatsapp';

async function testWebhook() {
  console.log('🧪 Testing webhook with simulated message...\n');

  const testPayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '746900131401929',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '919493904976',
                phone_number_id: '911449322059451'
              },
              contacts: [
                {
                  profile: {
                    name: 'Test User'
                  },
                  wa_id: '916281432326'
                }
              ],
              messages: [
                {
                  from: '916281432326',
                  id: 'wamid.test123',
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  text: {
                    body: 'Hi'
                  },
                  type: 'text'
                }
              ]
            },
            field: 'messages'
          }
        ]
      }
    ]
  };

  try {
    console.log('📡 Sending POST request to:', WEBHOOK_URL);
    console.log('📦 Payload:', JSON.stringify(testPayload, null, 2));
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    console.log('\n✅ Response status:', response.status);
    
    const text = await response.text();
    console.log('Response body:', text);

    if (response.ok) {
      console.log('\n🎉 Webhook test successful!');
      console.log('Check your server logs to see if the message was processed.');
    } else {
      console.log('\n❌ Webhook test failed!');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

testWebhook();
