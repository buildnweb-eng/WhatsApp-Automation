/**
 * Check WhatsApp Phone Number Status
 * 
 * This script checks the current status of your phone number
 */

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

async function checkPhoneStatus() {
  console.log('🔍 Checking phone number status...\n');
  
  console.log('📋 Configuration:');
  console.log(`   Phone Number ID: ${PHONE_NUMBER_ID}`);
  console.log(`   Access Token: ${ACCESS_TOKEN?.substring(0, 20)}...\n`);

  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.error('❌ Error: Missing PHONE_NUMBER_ID or ACCESS_TOKEN in .env file');
    process.exit(1);
  }

  try {
    const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}?fields=verified_name,display_phone_number,quality_rating,code_verification_status`;
    
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
      console.error('Status:', response.status, response.statusText);
      console.error('Error:', JSON.stringify(data, null, 2));
      process.exit(1);
    }

    console.log('\n✅ Phone number details:');
    console.log(JSON.stringify(data, null, 2));
    
    console.log('\n📊 Status Summary:');
    console.log(`   Display Name: ${data.verified_name || 'N/A'}`);
    console.log(`   Phone Number: ${data.display_phone_number || 'N/A'}`);
    console.log(`   Quality Rating: ${data.quality_rating || 'N/A'}`);
    console.log(`   Verification Status: ${data.code_verification_status || 'N/A'}\n`);

  } catch (error) {
    console.error('\n❌ Error checking status:');
    console.error(error);
    process.exit(1);
  }
}

checkPhoneStatus();
