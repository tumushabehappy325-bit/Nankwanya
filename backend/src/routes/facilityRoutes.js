const express = require('express');
const router = express.Router();
const store = require('../models/store');

// GET /api/facilities - List all facilities
router.get('/', async (req, res) => {
  try {
    const facilities = await store.getFacilities();
    res.json({ success: true, facilities });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/facilities/:id - Get specific facility
router.get('/:id', async (req, res) => {
  try {
    const facility = await store.getFacilityById(req.params.id);
    if (!facility) {
      return res.status(404).json({ success: false, error: 'Facility not found' });
    }
    res.json({ success: true, facility });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/facilities - Create or update facility
router.post('/', async (req, res) => {
  try {
    const { name, lat, lng, contactPhone, district } = req.body;
    if (!name || lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, error: 'Name, lat, and lng are required' });
    }
    const saved = await store.saveFacility({ name, lat, lng, contactPhone, district });
    res.status(201).json({ success: true, facility: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
