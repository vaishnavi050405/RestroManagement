require('dotenv').config();
const { sendSmsNotification } = require('./services/smsService');

const targetPhone = process.argv[2] || '9876543210';
const customerName = process.argv[3] || 'Valued Customer';

console.log(`\n========================================`);
console.log(`🚀 Testing SMS Dispatch via Fast2SMS`);
console.log(`📱 Recipient Number: ${targetPhone}`);
console.log(`👤 Customer Name: ${customerName}`);
console.log(`🔑 Provider: ${process.env.SMS_PROVIDER || 'mock'}`);
console.log(`========================================\n`);

const testMessage = `Dear ${customerName}, thank you for dining with us at RestroOps Gourmet! 🍽️ Invoice: #TEST-001 | Total: Rs. 1,250.00. We hope you had a great time!`;

sendSmsNotification({
  to: targetPhone,
  message: testMessage,
  customerName: customerName
}).then((res) => {
  console.log('\n[RESULT]:', JSON.stringify(res, null, 2));
  if (res.success) {
    console.log('\n✅ Test SMS executed successfully!');
  } else {
    console.log('\n❌ SMS delivery failed. Check your API key and credit balance.');
  }
}).catch((err) => {
  console.error('\n❌ Unexpected error:', err);
});
