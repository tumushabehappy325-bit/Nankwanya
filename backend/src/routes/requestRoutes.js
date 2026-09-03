const express = require('express');
const router = express.Router();
const store = require('../models/store');
const { findEligibleDonors } = require('../services/geofence');
const { sendSMS, composeBloodAlertMessage } = require('../services/smsService');
const { sendWhatsAppAlert } = require('../services/whatsappService');

// POST /api/requests - Create a blood request and mobilize nearby donors
router.post('/', async (req, res) => {
  try {
    const {
      facilityId,
      bloodType = 'ANY',
      urgency = 'urgent',
      radiusKm = 5,
      requiredUnits = 3,
      sendWhatsApp = false
    } = req.body;

    if (!facilityId) {
      return res.status(400).json({ success: false, error: 'facilityId is required' });
    }

    const facility = await store.getFacilityById(facilityId);
    if (!facility) {
      return res.status(404).json({ success: false, error: 'Facility not found' });
    }

    const radius = Math.min(Math.max(Number(radiusKm) || 5, 1), 25); // Range clamped 1-25km

    // 1. Fetch all registered donors
    const allDonors = await store.getUsers({ role: 'donor' });

    // 2. Haversine distance & blood compatibility matching
    const matchedDonors = findEligibleDonors({
      facilityLat: facility.lat,
      facilityLng: facility.lng,
      radiusKm: radius,
      bloodType,
      donors: allDonors
    });

    console.log(`[Blood Request] Facility: ${facility.name} | Blood: ${bloodType} | Radius: ${radius}km | Matched: ${matchedDonors.length} donors`);

    // 3. Save Blood Request
    const savedRequest = await store.saveBloodRequest({
      facilityId: facility.id,
      facilityName: facility.name,
      facilityLat: facility.lat,
      facilityLng: facility.lng,
      bloodType,
      urgency,
      radiusKm: radius,
      requiredUnits: Number(requiredUnits) || 3,
      status: 'active',
      matchedDonorsCount: matchedDonors.length,
      confirmedDonorsCount: 0
    });

    // 4. Compose Alert Message
    const alertMessage = composeBloodAlertMessage({
      bloodType,
      facilityName: facility.name,
      urgency
    });

    // 5. Broadcast to matched donors via Africa's Talking SMS (& WhatsApp stub)
    const alertResults = [];

    for (const donor of matchedDonors) {
      const alertMeta = {
        requestId: savedRequest.id,
        donorId: donor.id,
        facilityId: facility.id,
        facilityName: facility.name,
        bloodType,
        distanceKm: donor.distanceKm
      };

      // Real Africa's Talking SMS attempt
      const smsResult = await sendSMS({
        to: donor.phone,
        message: alertMessage,
        meta: alertMeta
      });

      // WhatsApp stub call (swap-in ready)
      if (sendWhatsApp) {
        await sendWhatsAppAlert({
          to: donor.phone,
          message: alertMessage,
          meta: alertMeta
        });
      }

      // Persist alert record to collection
      const alertDoc = await store.saveAlert({
        bloodRequestId: savedRequest.id,
        donorId: donor.id,
        donorName: donor.name,
        donorPhone: donor.phone,
        donorBloodType: donor.bloodType,
        donorLat: donor.lat,
        donorLng: donor.lng,
        distanceKm: donor.distanceKm,
        facilityName: facility.name,
        bloodType,
        channel: 'sms',
        status: smsResult.success ? (smsResult.alertRecord?.status || 'sent') : 'failed',
        message: alertMessage,
        sentAt: new Date().toISOString(),
        errorMessage: smsResult.error || null
      });

      alertResults.push(alertDoc);
    }

    res.status(201).json({
      success: true,
      request: savedRequest,
      matchedDonorsCount: matchedDonors.length,
      alertsDispatched: alertResults.length,
      alerts: alertResults,
      messageTemplate: alertMessage
    });
  } catch (err) {
    console.error('[Blood Request] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/requests - List all blood requests
router.get('/', async (req, res) => {
  try {
    const { status, facilityId } = req.query;
    const requests = await store.getBloodRequests({ status, facilityId });
    res.json({ success: true, count: requests.length, requests });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/requests/:id - Get request details, matched donors, and live alert stats
router.get('/:id', async (req, res) => {
  try {
    const request = await store.getBloodRequestById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Blood request not found' });
    }

    const alerts = await store.getAlerts({ bloodRequestId: req.params.id });

    const stats = {
      totalAlerted: alerts.length,
      confirmed: alerts.filter(a => a.status === 'confirmed').length,
      declined: alerts.filter(a => a.status === 'declined').length,
      pending: alerts.filter(a => a.status === 'sent' || a.status === 'delivered').length,
      failed: alerts.filter(a => a.status === 'failed').length
    };

    res.json({ success: true, request, stats, alerts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/requests/:id/status - Update request status (e.g. fulfilled, cancelled)
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'fulfilled', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const updated = await store.updateBloodRequest(req.params.id, { status });
    res.json({ success: true, request: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
