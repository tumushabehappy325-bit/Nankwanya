/**
 * WhatsApp Messaging Service Stub for Nankwanya
 * 
 * DESIGN: Swap-In Ready for WhatsApp Business Cloud API / Twilio WhatsApp
 * 
 * This service implements the exact same method signature as `smsService.js`:
 * `sendWhatsAppAlert({ to, message, meta })`
 * 
 * Once WhatsApp Business API credentials (WABA Phone Number ID + System User Access Token)
 * or Twilio WhatsApp credentials are approved, replace the stub execution inside
 * `sendWhatsAppAlert()` with the direct HTTP call to `https://graph.facebook.com/v19.0/{PHONE_NUMBER_ID}/messages`
 * without touching any route or controller code.
 */

const { normalizeUgandaPhone } = require('./smsService');

/**
 * Send a WhatsApp alert to a donor (Stub / Simulation)
 * @param {Object} params
 * @param {string} params.to - Recipient phone number (e.g. +256770000001)
 * @param {string} params.message - Alert message text or template parameters
 * @param {Object} [params.meta] - Additional metadata (requestId, donorId, facilityName, etc.)
 * @returns {Promise<Object>} Delivery result object
 */
async function sendWhatsAppAlert({ to, message, meta = {} }) {
  const formattedPhone = normalizeUgandaPhone(to);
  const timestamp = new Date().toISOString();

  console.log(`\n================= [WHATSAPP SERVICE: SWAP-IN READY STUB] =================`);
  console.log(`Channel:   WhatsApp Business (Interactive Template)`);
  console.log(`To:        whatsapp:${formattedPhone}`);
  console.log(`Body:      "${message}"`);
  console.log(`Payload:   `, JSON.stringify({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formattedPhone,
    type: 'text',
    text: { preview_url: false, body: message },
    metadata: meta
  }, null, 2));
  console.log(`Note:      Ready to connect to WhatsApp Cloud API without modifying caller routes.`);
  console.log(`===========================================================================\n`);

  const alertRecord = {
    channel: 'whatsapp',
    recipient: formattedPhone,
    message,
    sentAt: timestamp,
    meta,
    isStub: true,
    status: 'delivered', // simulated delivery for demo
    messageId: `waba-stub-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    provider: 'WhatsApp Cloud API (Stubbed)'
  };

  return {
    success: true,
    alertRecord,
    isStub: true,
    note: 'WhatsApp Business API stub executed. Ready for production credentials.'
  };
}

module.exports = {
  sendWhatsAppAlert
};
