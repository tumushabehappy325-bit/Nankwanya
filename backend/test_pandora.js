require('dotenv').config();

const {
  sendSMS,
  composeBloodAlertMessage
} = require('./src/services/smsService');

async function testPandora() {
  console.log('Testing Pandora SMS...');

  const message = composeBloodAlertMessage({
    donorName: 'Nankwanya Happy',
    bloodType: 'O+',
    facilityName: 'Mbarara Regional Referral Hospital',
    distanceKm: 3.2
  });

  const result = await sendSMS({
    to: '0703005047',
    message,
    meta: {
      test: true
    }
  });

  console.log('\nPandora Result:');
  console.log(JSON.stringify(result, null, 2));
}

testPandora();
