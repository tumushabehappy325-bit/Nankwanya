/**
 * Nankwanya Seed Data Generator - Mbarara, Uganda
 * 
 * Generates:
 * - 3 Real Mbarara area hospitals
 * - 40 Realistic voluntary blood donors located in Mbarara Municipality neighborhoods
 * - 1 Demo Admin account
 */

const MBARARA_FACILITIES = [
  {
    id: 'fac_mrrh',
    name: 'Mbarara Regional Referral Hospital (MRRH)',
    lat: -0.6085,
    lng: 30.6565,
    contactPhone: '+256485420027',
    district: 'Mbarara City',
    description: 'Main public tertiary referral hospital and teaching hospital for MUST (Mbarara University of Science & Technology).'
  },
  {
    id: 'fac_mayanja',
    name: 'Mayanja Memorial Hospital',
    lat: -0.5982,
    lng: 30.6691,
    contactPhone: '+256382279888',
    district: 'Mbarara City',
    description: 'Private specialized hospital along Mbarara-Masaka Highway.'
  },
  {
    id: 'fac_holy_innocents',
    name: 'Holy Innocents Children\'s Hospital',
    lat: -0.6350,
    lng: 30.6320,
    contactPhone: '+256392745300',
    district: 'Mbarara City',
    description: 'Dedicated pediatric referral hospital located in Nyamitanga.'
  }
];

const MBARARA_NEIGHBORHOODS = [
  { name: 'Kamukuzi', lat: -0.6020, lng: 30.6510 },
  { name: 'Kakoba', lat: -0.6120, lng: 30.6720 },
  { name: 'Nyamitanga', lat: -0.6280, lng: 30.6410 },
  { name: 'Ruharo', lat: -0.6030, lng: 30.6280 },
  { name: 'Kashanyarazi', lat: -0.5940, lng: 30.6480 },
  { name: 'Katete', lat: -0.6210, lng: 30.6610 },
  { name: 'Mbarara Town Center / High Street', lat: -0.6075, lng: 30.6580 },
  { name: 'Bwizibwera Road', lat: -0.5750, lng: 30.6350 },
  { name: 'Kakiika', lat: -0.5820, lng: 30.6800 },
  { name: 'Ruti', lat: -0.6420, lng: 30.6490 }
];

const UGANDAN_NAMES = [
  'Katushabe Allen', 'Muhwezi Brian', 'Tumusiime Emmanuel', 'Kyomugisha Brenda',
  'Mugisha Davis', 'Asiimwe Grace', 'Akampurira Isaac', 'Namanya Joan',
  'Twesigye Kenneth', 'Nuwagaba Lillian', 'Bwambale Ronald', 'Ainembabazi Mercy',
  'Kiconco Patience', 'Tusingwire Derrick', 'Ninsiima Faith', 'Mugume Ivan',
  'Kembabazi Sandra', 'Tayebwa Victor', 'Ahimbisibwe Denis', 'Atuhaire Sarah',
  'Arinda Joshua', 'Natukunda Hope', 'Mwesigwa Patrick', 'Kemigisha Rachel',
  'Rukundo Alex', 'Nabaasa Fiona', 'Twinamatsiko Caleb', 'Kobusingye Christine',
  'Mwebaze Dan', 'Kyobutungi Diana', 'Byamukama Frank', 'Ainebyoona Gloria',
  'Tibesigwa Justus', 'Niwareeba Kevin', 'Komuhangi Maria', 'Taremwa Oscar',
  'Niwagaba Sheila', 'Akatwijuka Timothy', 'Nshabohurira Valerie', 'Kansiime Walter'
];

const BLOOD_TYPE_DISTRIBUTION = [
  'O+', 'O+', 'O+', 'O+', 'O+', 'O+', 'O+', 'O+', 'O+', 'O+', // 25%
  'A+', 'A+', 'A+', 'A+', 'A+', 'A+', 'A+', 'A+',             // 20%
  'B+', 'B+', 'B+', 'B+', 'B+', 'B+',                         // 15%
  'O-', 'O-', 'O-',                                           // 7.5%
  'A-', 'A-',                                                 // 5%
  'B-', 'B-',                                                 // 5%
  'AB+', 'AB+', 'AB+',                                        // 7.5%
  'AB-'                                                       // 2.5%
];

function generateSeedDonors() {
  const donors = [];

  UGANDAN_NAMES.forEach((name, index) => {
    const neighborhood = MBARARA_NEIGHBORHOODS[index % MBARARA_NEIGHBORHOODS.length];
    // Small random jitter ±0.008 degrees (~0.9km) around neighborhood center
    const jitterLat = (Math.random() - 0.5) * 0.016;
    const jitterLng = (Math.random() - 0.5) * 0.016;
    const bloodType = BLOOD_TYPE_DISTRIBUTION[index % BLOOD_TYPE_DISTRIBUTION.length];
    const phoneNum = String(index + 1).padStart(3, '0');

    // Last donation between 30 and 150 days ago
    const daysAgo = Math.floor(Math.random() * 120) + 30;
    const lastDonation = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    donors.push({
      id: `usr_donor_${index + 1}`,
      name,
      phone: `+256770000${phoneNum}`,
      role: 'donor',
      bloodType,
      lat: Math.round((neighborhood.lat + jitterLat) * 100000) / 100000,
      lng: Math.round((neighborhood.lng + jitterLng) * 100000) / 100000,
      lastDonationDate: lastDonation,
      neighborhood: neighborhood.name,
      totalDonations: Math.floor(Math.random() * 8) + 1,
      createdAt: new Date(Date.now() - (index + 1) * 86400000).toISOString()
    });
  });

  return donors;
}

const DEMO_ADMIN = {
  id: 'usr_admin_mrrh',
  name: 'Sister Mary Kyomukama (Blood Bank Coordinator)',
  phone: '+256772123456',
  role: 'admin',
  bloodType: 'O+',
  facilityId: 'fac_mrrh',
  lat: -0.6085,
  lng: 30.6565,
  createdAt: new Date().toISOString()
};

async function seedDatabase(storeInstance) {
  const store = storeInstance || require('../backend/src/models/store');
  console.log('[Seed] Starting database seeding for Mbarara, Uganda...');

  // Seed Facilities
  for (const fac of MBARARA_FACILITIES) {
    await store.saveFacility(fac);
  }
  console.log(`[Seed] Successfully seeded ${MBARARA_FACILITIES.length} Mbarara health facilities.`);

  // Seed Admin
  await store.saveUser(DEMO_ADMIN);
  console.log(`[Seed] Seeded hospital blood bank admin: ${DEMO_ADMIN.name}`);

  // Seed Donors
  const donors = generateSeedDonors();
  for (const donor of donors) {
    await store.saveUser(donor);
  }
  console.log(`[Seed] Successfully seeded ${donors.length} voluntary donors across Mbarara municipality.`);

  return {
    facilitiesCount: MBARARA_FACILITIES.length,
    donorsCount: donors.length,
    facilities: MBARARA_FACILITIES,
    donors
  };
}

if (require.main === module) {
  seedDatabase()
    .then((res) => {
      console.log('\nSeeding completed successfully!');
      console.log(`Facilities: ${res.facilitiesCount}`);
      console.log(`Donors:     ${res.donorsCount}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seeding error:', err);
      process.exit(1);
    });
}

module.exports = {
  MBARARA_FACILITIES,
  MBARARA_NEIGHBORHOODS,
  generateSeedDonors,
  DEMO_ADMIN,
  seedDatabase
};
