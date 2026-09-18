/**
 * Automated Verification Test for Nankwanya Backend
 */

const {
  haversineDistance,
  isBloodCompatible,
  findEligibleDonors,
  MIN_DONATION_INTERVAL_DAYS,
  isDonationIntervalElapsed
} = require('./src/services/geofence');
const store = require('./src/models/store');
const { seedDatabase, MBARARA_FACILITIES } = require('../seed/seedData');
process.env.PANDORA_USERNAME = process.env.PANDORA_USERNAME || 'test-user';
process.env.PANDORA_PASSWORD = process.env.PANDORA_PASSWORD || 'test-password';
const { sendSMS, normalizeUgandaPhone, composeBloodAlertMessage } = require('./src/services/smsService');
const { sendWhatsAppAlert } = require('./src/services/whatsappService');

async function runTests() {
  console.log('🧪 Starting Nankwanya Verification Tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✕ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Haversine Distance Test
  console.log('[1] Testing Haversine Distance Calculation...');
  // Distance between MRRH (-0.6085, 30.6565) and Mayanja Memorial (-0.5982, 30.6691) is ~1.82 km
  const distMRRHToMayanja = haversineDistance(-0.6085, 30.6565, -0.5982, 30.6691);
  assert(distMRRHToMayanja > 1.7 && distMRRHToMayanja < 2.0, `MRRH to Mayanja distance is ${distMRRHToMayanja} km (expected ~1.82 km)`);

  // Same coordinate should be 0
  const distZero = haversineDistance(-0.6085, 30.6565, -0.6085, 30.6565);
  assert(distZero === 0, `Self distance is 0 km`);

  // 2. Blood Compatibility Test
  console.log('\n[2] Testing Blood Compatibility Logic...');
  assert(isBloodCompatible('O-', 'B+'), 'O- donor is compatible with B+ recipient');
  assert(isBloodCompatible('B+', 'B+'), 'B+ donor is compatible with B+ recipient');
  assert(!isBloodCompatible('A+', 'B+'), 'A+ donor is NOT compatible with B+ recipient');
  assert(isBloodCompatible('O-', 'AB+'), 'O- donor is compatible with AB+ recipient (universal recipient)');
  assert(isBloodCompatible('AB+', 'AB+'), 'AB+ donor is compatible with AB+ recipient');
  assert(!isBloodCompatible('AB+', 'O+'), 'AB+ donor is NOT compatible with O+ recipient');
  assert(isBloodCompatible('O+', 'ANY'), 'O+ matches ANY request');

  // 3. Database Seeding Test
  console.log('\n[3] Testing Seeding...');
  const seedResult = await seedDatabase(store);
  assert(seedResult.facilitiesCount === 3, `Seeded 3 Mbarara facilities`);
  assert(seedResult.donorsCount >= 30, `Seeded ${seedResult.donorsCount} voluntary donors`);

  const facilities = await store.getFacilities();
  assert(facilities.length === 3, `Store contains 3 facilities`);

  const mrrh = await store.getFacilityById('fac_mrrh');
  assert(mrrh && mrrh.name.includes('Mbarara Regional Referral Hospital'), `MRRH retrieved correctly`);

  // 4. Geofence Filter & Donation Interval Test
  console.log('\n[4] Testing Geofence Matching & 90-Day Donation Interval...');
  assert(MIN_DONATION_INTERVAL_DAYS === 90, 'MIN_DONATION_INTERVAL_DAYS named constant is 90');

  // Test interval helper
  const now = new Date();
  const date14DaysAgo = new Date(now.getTime() - 14 * 86400000).toISOString().split('T')[0];
  const date95DaysAgo = new Date(now.getTime() - 95 * 86400000).toISOString().split('T')[0];
  
  const check14 = isDonationIntervalElapsed(date14DaysAgo, now);
  assert(check14.eligible === false, 'Donor who donated 14 days ago is INELIGIBLE (<90 days)');
  assert(check14.daysSinceDonation >= 13 && check14.daysSinceDonation <= 15, `Computed days since donation is ${check14.daysSinceDonation}`);

  const check95 = isDonationIntervalElapsed(date95DaysAgo, now);
  assert(check95.eligible === true, 'Donor who donated 95 days ago is ELIGIBLE (>=90 days)');

  const checkNever = isDonationIntervalElapsed(null, now);
  assert(checkNever.eligible === true, 'First-time donor (null date) is ELIGIBLE');

  const allDonors = await store.getUsers({ role: 'donor' });
  const matched5km = findEligibleDonors({
    facilityLat: mrrh.lat,
    facilityLng: mrrh.lng,
    radiusKm: 5,
    bloodType: 'O+',
    donors: allDonors,
    referenceDate: now
  });
  assert(matched5km.length > 0, `Found ${matched5km.length} eligible O+ donors within 5 km of MRRH`);
  assert(matched5km[0].distanceKm <= matched5km[matched5km.length - 1].distanceKm, 'Donors sorted nearest first');

  // Verify that any donor with lastDonationDate < 90 days ago is NOT in matched5km
  const anyRecentInMatched = matched5km.some(d => {
    if (!d.lastDonationDate) return false;
    const diff = Math.floor((now.getTime() - new Date(d.lastDonationDate).getTime()) / 86400000);
    return diff < 90;
  });
  assert(!anyRecentInMatched, 'Zero recent donors (<90 days) included in matched alerts (3-condition filter verified)');

  const matched2km = findEligibleDonors({
    facilityLat: mrrh.lat,
    facilityLng: mrrh.lng,
    radiusKm: 2,
    bloodType: 'O+',
    donors: allDonors,
    referenceDate: now
  });
  assert(matched2km.length <= matched5km.length, `2km radius (${matched2km.length}) is subset of 5km radius (${matched5km.length})`);

  // 5. Pandora Phone Normalization & Message Composition
  console.log('\n[5] Testing Phone Normalization & SMS Services...');
  assert(normalizeUgandaPhone('0770000001') === '256770000001', 'Normalizes 077... to Pandora 25677...');
  assert(normalizeUgandaPhone('256770000001') === '256770000001', 'Leaves Pandora 256... intact');
  assert(normalizeUgandaPhone('+256770000001') === '256770000001', 'Normalizes +256... to Pandora 256...');
  assert(normalizeUgandaPhone('not-a-phone') === '', 'Rejects invalid phone numbers');

  const alertMsg = composeBloodAlertMessage({
    bloodType: 'O+',
    facilityName: 'Mbarara Regional Referral Hospital',
    urgency: 'urgent',
    donorName: 'Nankwanya Happy',
    distanceKm: 3.2
  });
  assert(
    alertMsg === '🩸 NANKWANYA: Hello Happy, O+ blood is urgently needed at Mbarara Regional Referral Hospital, 3.2km away. Call 0800 122 422 or open Nankwanya app to confirm.',
    'Composes personalized Pandora SMS message'
  );

  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    const body = new URLSearchParams(options.body);
    assert(url.includes('send_sms'), 'Uses Pandora SMS API endpoint');
    assert(options.method === 'POST', 'Sends Pandora request with POST');
    assert(body.get('number') === '256770000001', 'Sends normalized Pandora phone number');
    assert(body.get('message') === alertMsg, 'Sends composed alert message');
    assert(body.get('username') !== null, 'Includes Pandora username parameter');
    assert(body.get('password') !== null, 'Includes Pandora password parameter');

    return {
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify({ success: true, message_id: 'pandora-test-message' });
      }
    };
  };

  let smsRes;
  try {
    smsRes = await sendSMS({
      to: '+256770000001',
      message: alertMsg,
      meta: { test: true }
    });
  } finally {
    global.fetch = originalFetch;
  }
  assert(smsRes.success === true, 'SMS service dispatches successfully through Pandora response handling');
  assert(smsRes.alertRecord.provider === 'Pandora SMS', 'SMS alert record identifies Pandora provider');

  const waRes = await sendWhatsAppAlert({
    to: '+256770000001',
    message: alertMsg,
    meta: { test: true }
  });
  assert(waRes.success === true && waRes.isStub === true, 'WhatsApp stub executes successfully');

  // 6. Blood Request & Alert Cycle
  console.log('\n[6] Testing Blood Request & Alert Confirmation Cycle...');
  const req = await store.saveBloodRequest({
    facilityId: mrrh.id,
    facilityName: mrrh.name,
    facilityLat: mrrh.lat,
    facilityLng: mrrh.lng,
    bloodType: 'B+',
    urgency: 'urgent',
    radiusKm: 5,
    requiredUnits: 3,
    status: 'active'
  });
  assert(req.id !== undefined, `Blood request created: ${req.id}`);

  const testDonor = matched5km[0];
  const alert = await store.saveAlert({
    bloodRequestId: req.id,
    donorId: testDonor.id,
    donorName: testDonor.name,
    donorPhone: testDonor.phone,
    donorBloodType: testDonor.bloodType,
    facilityName: mrrh.name,
    bloodType: 'B+',
    status: 'sent',
    message: alertMsg
  });
  assert(alert.status === 'sent', 'Alert saved with status: sent');

  // Simulate Inbound SMS "YES"
  const donorRecord = await store.getUserByPhone(testDonor.phone);
  assert(donorRecord !== null, `Found donor by phone ${testDonor.phone}`);

  const latestPending = await store.getLatestPendingAlertForDonor(testDonor.id);
  assert(latestPending !== null && latestPending.id === alert.id, 'Retrieved pending alert');

  const confirmedAlert = await store.updateAlert(latestPending.id, {
    status: 'confirmed',
    respondedAt: new Date().toISOString(),
    responseChannel: 'sms'
  });
  assert(confirmedAlert.status === 'confirmed', 'Alert updated to confirmed status');

  // 7. Uganda DPPA 2019 Contact Disclosure Audit Trail Test
  console.log('\n[7] Testing DPPA 2019 Contact Disclosure Audit Trail...');
  const disclosure = await store.saveContactDisclosure({
    alertId: alert.id,
    requestedBy: 'Sister Mary Kyomukama (MRRH)',
    requestedAt: new Date().toISOString()
  });
  assert(disclosure.id.startsWith('disc_'), `Created contact disclosure audit record: ${disclosure.id}`);
  assert(disclosure.requestedBy === 'Sister Mary Kyomukama (MRRH)', 'Recorded requester identity');

  const disclosuresForAlert = await store.getContactDisclosures({ alertId: alert.id });
  assert(disclosuresForAlert.length >= 1, `Retrieved ${disclosuresForAlert.length} disclosure records for alert ${alert.id}`);
  assert(disclosuresForAlert[0].alertId === alert.id, 'Audit record correctly linked to alert');

  // 8. Uganda DPPA 2019 Donor Consent Enforcement Test
  console.log('\n[8] Testing DPPA 2019 Donor Consent Enforcement...');
  const testConsentDonor = await store.saveUser({
    name: 'Byamugisha Ronald',
    phone: '+256770999888',
    bloodType: 'O+',
    role: 'donor',
    consentGiven: true,
    consentTimestamp: new Date().toISOString()
  });
  assert(testConsentDonor.consentGiven === true, 'Donor record saved with consentGiven = true');
  assert(testConsentDonor.consentTimestamp !== null, `Consent timestamp recorded: ${testConsentDonor.consentTimestamp}`);

  // Seed donors consent check
  const seededWithConsent = allDonors.filter(d => d.consentGiven === true);
  assert(seededWithConsent.length === allDonors.length, `All ${allDonors.length} seeded donors have verified DPPA consent on file`);

  console.log(`\n=============================================================`);
  console.log(`🎉 TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log(`=============================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test run failed with error:', err);
  process.exit(1);
});
