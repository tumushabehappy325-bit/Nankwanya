/**
 * Automated Verification Test for Nankwanya Backend
 */

const { haversineDistance, isBloodCompatible, findEligibleDonors } = require('./src/services/geofence');
const store = require('./src/models/store');
const { seedDatabase, MBARARA_FACILITIES } = require('../seed/seedData');
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

  // 4. Geofence Filter Test
  console.log('\n[4] Testing Geofence Matching...');
  const allDonors = await store.getUsers({ role: 'donor' });
  const matched5km = findEligibleDonors({
    facilityLat: mrrh.lat,
    facilityLng: mrrh.lng,
    radiusKm: 5,
    bloodType: 'O+',
    donors: allDonors
  });
  assert(matched5km.length > 0, `Found ${matched5km.length} O+ donors within 5 km of MRRH`);
  assert(matched5km[0].distanceKm <= matched5km[matched5km.length - 1].distanceKm, 'Donors sorted nearest first');

  const matched2km = findEligibleDonors({
    facilityLat: mrrh.lat,
    facilityLng: mrrh.lng,
    radiusKm: 2,
    bloodType: 'O+',
    donors: allDonors
  });
  assert(matched2km.length <= matched5km.length, `2km radius (${matched2km.length}) is subset of 5km radius (${matched5km.length})`);

  // 5. Africa's Talking Phone Normalization & Message Composition
  console.log('\n[5] Testing Phone Normalization & SMS Services...');
  assert(normalizeUgandaPhone('0770000001') === '+256770000001', 'Normalizes 077... to +25677...');
  assert(normalizeUgandaPhone('256770000001') === '+256770000001', 'Normalizes 256... to +256...');
  assert(normalizeUgandaPhone('+256770000001') === '+256770000001', 'Leaves +256... intact');

  const alertMsg = composeBloodAlertMessage({
    bloodType: 'B+',
    facilityName: 'MRRH',
    urgency: 'urgent'
  });
  assert(alertMsg.includes('Urgent need for B+ blood at MRRH'), 'Composes standard SMS message');

  const smsRes = await sendSMS({
    to: '+256770000001',
    message: alertMsg,
    meta: { test: true }
  });
  assert(smsRes.success === true, 'SMS service dispatches successfully (simulation/sandbox)');

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
