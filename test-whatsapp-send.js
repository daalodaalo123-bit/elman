// Quick test script to send a WhatsApp message
// Run this after starting your server: node test-whatsapp-send.js

const testPhone = process.argv[2]; // Get phone number from command line

if (!testPhone) {
  console.log('Usage: node test-whatsapp-send.js +1234567890');
  console.log('Example: node test-whatsapp-send.js +1234567890');
  process.exit(1);
}

async function test() {
  try {
    const response = await fetch('http://localhost:5050/api/customers/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // You'll need to get a token first by logging in
        'Authorization': 'Bearer YOUR_TOKEN_HERE'
      },
      body: JSON.stringify({
        message: 'Test message from Elman system! 🎉',
        customer_ids: [] // We'll send to a specific number via API
      })
    });

    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

console.log('Note: This requires you to:');
console.log('1. Start your server (npm run dev)');
console.log('2. Login to get an auth token');
console.log('3. Replace YOUR_TOKEN_HERE with your actual token');
console.log('\nOr better: Complete a sale with a customer who has a phone number!');
