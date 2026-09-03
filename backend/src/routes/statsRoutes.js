const express = require('express');
const router = express.Router();
const store = require('../models/store');

// GET /api/stats - Global platform statistics
router.get('/', async (req, res) => {
  try {
    const donors = await store.getUsers({ role: 'donor' });
    const facilities = await store.getFacilities();
    const requests = await store.getBloodRequests();
    const alerts = await store.getAlerts();

    const activeRequests = requests.filter(r => r.status === 'active');
    const confirmedAlerts = alerts.filter(a => a.status === 'confirmed');

    // Blood type breakdown for donors
    const bloodTypeCounts = {};
    ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'].forEach(bt => bloodTypeCounts[bt] = 0);
    donors.forEach(d => {
      if (d.bloodType) bloodTypeCounts[d.bloodType] = (bloodTypeCounts[d.bloodType] || 0) + 1;
    });

    res.json({
      success: true,
      stats: {
        totalDonors: donors.length,
        totalFacilities: facilities.length,
        activeRequestsCount: activeRequests.length,
        totalRequestsCount: requests.length,
        totalAlertsDispatched: alerts.length,
        totalConfirmedDonations: confirmedAlerts.length,
        confirmationRate: alerts.length > 0 ? Math.round((confirmedAlerts.length / alerts.length) * 100) : 0,
        bloodTypeDistribution: bloodTypeCounts
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
