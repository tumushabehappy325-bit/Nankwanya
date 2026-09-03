const express = require('express');
const router = express.Router();
const store = require('../models/store');

// GET /api/alerts - List all alerts with optional query filters
router.get('/', async (req, res) => {
  try {
    const { bloodRequestId, donorId, status } = req.query;
    const alerts = await store.getAlerts({ bloodRequestId, donorId, status });
    res.json({ success: true, count: alerts.length, alerts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/alerts/:id/respond - In-app donor response (Confirm / Decline)
router.post('/:id/respond', async (req, res) => {
  try {
    const { action } = req.body; // 'confirm' or 'decline'
    if (!['confirm', 'decline'].includes(action)) {
      return res.status(400).json({ success: false, error: 'action must be "confirm" or "decline"' });
    }

    const alert = await store.getAlertById(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    const newStatus = action === 'confirm' ? 'confirmed' : 'declined';
    const updated = await store.updateAlert(alert.id, {
      status: newStatus,
      respondedAt: new Date().toISOString(),
      responseChannel: 'inapp'
    });

    // Update count on parent blood request
    if (alert.bloodRequestId) {
      const allAlerts = await store.getAlerts({ bloodRequestId: alert.bloodRequestId });
      const confirmedCount = allAlerts.filter(a => a.status === 'confirmed').length;
      await store.updateBloodRequest(alert.bloodRequestId, { confirmedDonorsCount: confirmedCount });
    }

    console.log(`[Alert Response] In-App Donor: ${alert.donorName} (${alert.donorPhone}) responded: ${newStatus.toUpperCase()}`);

    res.json({ success: true, alert: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/sms/inbound - Africa's Talking Inbound SMS Webhook
// Africa's Talking posts incoming SMS to this endpoint (from, text, to, date, id)
router.post('/sms-inbound', async (req, res) => {
  try {
    const { from, text } = req.body;
    console.log(`[Inbound SMS Webhook] Received from: ${from} | Text: "${text}"`);

    if (!from || !text) {
      return res.status(400).json({ success: false, error: 'from and text are required' });
    }

    const donor = await store.getUserByPhone(from);
    if (!donor) {
      console.log(`[Inbound SMS] Unregistered sender: ${from}`);
      return res.status(200).send('Sender not recognized in Nankwanya donor registry.');
    }

    const latestAlert = await store.getLatestPendingAlertForDonor(donor.id);
    if (!latestAlert) {
      console.log(`[Inbound SMS] No pending alerts found for donor: ${donor.name}`);
      return res.status(200).send('No active blood request pending for your profile.');
    }

    const cleanText = text.trim().toUpperCase();
    const isYes = cleanText.includes('YES') || cleanText === 'Y' || cleanText === '1' || cleanText.includes('AVAILABLE');
    const isNo = cleanText.includes('NO') || cleanText === 'N' || cleanText === '0';

    const newStatus = isYes ? 'confirmed' : (isNo ? 'declined' : 'confirmed');

    const updatedAlert = await store.updateAlert(latestAlert.id, {
      status: newStatus,
      respondedAt: new Date().toISOString(),
      responseChannel: 'sms',
      donorRawReply: text
    });

    // Update parent request confirmed count
    if (latestAlert.bloodRequestId) {
      const allAlerts = await store.getAlerts({ bloodRequestId: latestAlert.bloodRequestId });
      const confirmedCount = allAlerts.filter(a => a.status === 'confirmed').length;
      await store.updateBloodRequest(latestAlert.bloodRequestId, { confirmedDonorsCount: confirmedCount });
    }

    console.log(`[Inbound SMS Webhook] Matched alert ${latestAlert.id} for ${donor.name} -> Status: ${newStatus.toUpperCase()}`);

    // Return plain text response or 200 OK for Africa's Talking
    res.status(200).json({
      success: true,
      message: `Thank you ${donor.name}. Your response (${newStatus}) has been recorded at ${latestAlert.facilityName}. - Nankwanya`,
      alert: updatedAlert
    });
  } catch (err) {
    console.error('[Inbound SMS Webhook] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/alerts/simulate-response - Demo / Judge Helper to simulate donor SMS response
router.post('/simulate-response', async (req, res) => {
  try {
    const { donorId, donorPhone, action = 'confirm', alertId } = req.body;

    let targetAlert = null;
    if (alertId) {
      targetAlert = await store.getAlertById(alertId);
    } else if (donorId) {
      targetAlert = await store.getLatestPendingAlertForDonor(donorId);
    } else if (donorPhone) {
      const donor = await store.getUserByPhone(donorPhone);
      if (donor) {
        targetAlert = await store.getLatestPendingAlertForDonor(donor.id);
      }
    }

    if (!targetAlert) {
      return res.status(404).json({ success: false, error: 'No matching alert found to simulate response for' });
    }

    const newStatus = action === 'confirm' ? 'confirmed' : 'declined';
    const updated = await store.updateAlert(targetAlert.id, {
      status: newStatus,
      respondedAt: new Date().toISOString(),
      responseChannel: 'sms_simulated'
    });

    if (targetAlert.bloodRequestId) {
      const allAlerts = await store.getAlerts({ bloodRequestId: targetAlert.bloodRequestId });
      const confirmedCount = allAlerts.filter(a => a.status === 'confirmed').length;
      await store.updateBloodRequest(targetAlert.bloodRequestId, { confirmedDonorsCount: confirmedCount });
    }

    console.log(`[Demo Simulator] Simulated SMS response for ${targetAlert.donorName}: ${newStatus.toUpperCase()}`);

    res.json({
      success: true,
      simulatedStatus: newStatus,
      alert: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
