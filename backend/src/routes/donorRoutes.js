const express = require('express');
const router = express.Router();
const store = require('../models/store');
const { haversineDistance } = require('../services/geofence');

// GET /api/donors - List all donors with optional filtering
router.get('/', async (req, res) => {
  try {
    const { bloodType, lat, lng, radiusKm } = req.query;
    let donors = await store.getUsers({ role: 'donor' });

    if (bloodType && bloodType !== 'ANY') {
      donors = donors.filter(d => d.bloodType === bloodType);
    }

    if (lat && lng) {
      const centerLat = Number(lat);
      const centerLng = Number(lng);
      const radius = Number(radiusKm) || 10;

      donors = donors.map(d => ({
        ...d,
        distanceKm: haversineDistance(centerLat, centerLng, d.lat, d.lng)
      })).filter(d => d.distanceKm <= radius);
    }

    res.json({ success: true, count: donors.length, donors });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/donors/:id - Get donor profile & alerts
router.get('/:id', async (req, res) => {
  try {
    const user = await store.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Donor not found' });
    }
    const alerts = await store.getAlerts({ donorId: req.params.id });
    res.json({ success: true, donor: user, alerts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/donors - Register or update donor (with Uganda DPPA 2019 consent requirement)
router.post('/', async (req, res) => {
  try {
    const { id, name, phone, bloodType, lat, lng, lastDonationDate, neighborhood, consentGiven, consentTimestamp } = req.body;
    if (!phone || !bloodType) {
      return res.status(400).json({ success: false, error: 'Phone and bloodType are required' });
    }

    const isConsentGiven = consentGiven === true || consentGiven === 'true';
    // For new registrations (no existing id), consent is strictly required under Uganda DPPA 2019
    if (!id && !isConsentGiven) {
      return res.status(400).json({
        success: false,
        error: 'Consent is required under the Uganda Data Protection and Privacy Act (DPPA 2019) to store location and blood type for alerts.'
      });
    }

    const saved = await store.saveUser({
      id,
      name: name || 'Anonymous Donor',
      phone,
      bloodType,
      role: 'donor',
      lat: Number(lat) || -0.607,
      lng: Number(lng) || 30.654,
      lastDonationDate: lastDonationDate || null,
      neighborhood: neighborhood || 'Mbarara Town',
      consentGiven: isConsentGiven,
      consentTimestamp: consentTimestamp || (isConsentGiven ? new Date().toISOString() : null)
    });

    res.status(201).json({ success: true, donor: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/donors/:id/location - Update geolocation
router.post('/:id/location', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, error: 'lat and lng are required' });
    }

    const updated = await store.updateUser(req.params.id, {
      lat: Number(lat),
      lng: Number(lng)
    });

    res.json({ success: true, donor: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
