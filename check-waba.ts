/**
 * Check which WhatsApp Business Account owns this phone number
 */

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WABA_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

async function checkWABA() {
  console.log('🔍 Checking WhatsApp Business Account details...\n');
  
  console.log('📋 Configuration from .env:');
  console.log(`   Phone Number ID: ${PHONE_NUMBER_ID}`);
  console.log(`   WABA ID: ${WABA_ID}\n`);

  try {
    // Check phone number details
    console.log('📱 Checking phone number details...');
    const phoneUrl = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}`;
    const phoneResponse = await fetch(phoneUrl, {
      headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` },
    });
    const phoneData = await phoneResponse.json();
    
    console.log('Phone Number Info:', JSON.stringify(phoneData, null, 2));

    // Check WABA details
    console.log('\n🏢 Checking WhatsApp Business Account details...');
    const wabaUrl = `https://graph.facebook.com/v21.0/${WABA_ID}?fields=id,name,timezone_id,message_template_namespace`;
    const wabaResponse = await fetch(wabaUrl, {
      headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` },
    });
    const wabaData = await wabaResponse.json();
    
    console.log('WABA Info:', JSON.stringify(wabaData, null, 2));

    // Check phone numbers in this WABA
    console.log('\n📞 Checking all phone numbers in this WABA...');
    const numbersUrl = `https://graph.facebook.com/v21.0/${WABA_ID}/phone_numbers`;
    const numbersResponse = await fetch(numbersUrl, {
      headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` },
    });
    const numbersData = await numbersResponse.json();
    
    console.log('Phone Numbers in WABA:', JSON.stringify(numbersData, null, 2));

    console.log('\n✅ Summary:');
    console.log(`   WABA Name: ${wabaData.name || 'N/A'}`);
    console.log(`   WABA ID: ${wabaData.id || 'N/A'}`);
    console.log(`   Phone Numbers Count: ${numbersData.data?.length || 0}`);
    if (numbersData.data && numbersData.data.length > 0) {
      numbersData.data.forEach((phone: any, index: number) => {
        console.log(`   ${index + 1}. ${phone.display_phone_number} (ID: ${phone.id}) - Status: ${phone.code_verification_status || 'N/A'}`);
      });
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

checkWABA();
