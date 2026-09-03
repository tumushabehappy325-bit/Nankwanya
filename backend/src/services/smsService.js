/**
 * Africa's Talking SMS Gateway Service for Nankwanya
 * 
 * Supports:
 * - Africa's Talking Live & Sandbox environments (Username: sandbox)
 * - Uganda mobile numbers (+256...)
 * - Automatic message formatting: "Urgent need for [bloodType] blood at [facility]. Reply YES if available. - Nankwanya"
 * - Graceful fallback / simulation logging when running without active credentials or network
 */

require('dotenv').config();

let africasTalkingClient = null;
let smsClient = null;

const AT_USERNAME = process.env.AT_USERNAME || 'sandbox';
const AT_API_KEY = process.env.AT_API_KEY || '';
const AT_SENDER_ID = process.env.AT_SENDER_ID || undefined; // e.g. 'Nankwanya' if approved, undefined for sandbox default

function initAfricasTalking() {
  if (smsClient) return smsClient;

  if (AT_API_KEY && AT_API_KEY !== 'YOUR_AFRICAS_TALKING_API_KEY') {
    try {
      const AfricasTalking = require('africastalking');
      africasTalkingClient = AfricasTalking({
        apiKey: AT_API_KEY,
        username: AT_USERNAME
      });
      smsClient = africasTalkingClient.SMS;
      console.log(`[SMS Service] Initialized Africa's Talking SDK with username: ${AT_USERNAME}`);
    } catch (err) {
      console.warn(`[SMS Service] Failed to initialize Africa's Talking SDK: ${err.message}. Falling back to simulation mode.`);
    }
  } else {
    console.log(`[SMS Service] Running in sandbox/simulation mode (AT_API_KEY not configured or placeholder).`);
  }
  return smsClient;
}

/**
 * Format phone number to international E.164 format (+256...)
 * @param {string} phone
 * @returns {string}
 */
function normalizeUgandaPhone(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '+256' + cleaned.substring(1);
  } else if (cleaned.startsWith('256')) {
    cleaned = '+' + cleaned;
  } else if (!cleaned.startsWith('+')) {
    cleaned = '+256' + cleaned;
  }
  return cleaned;
}

/**
 * Send an SMS alert to a donor
 * @param {Object} params
 * @param {string} params.to - Recipient phone number (e.g. +256770000001)
 * @param {string} params.message - Alert message text
 * @param {Object} [params.meta] - Additional metadata (requestId, donorId, facilityName, etc.)
 * @returns {Promise<Object>} Delivery result object
 */
async function sendSMS({ to, message, meta = {} }) {
  const formattedPhone = normalizeUgandaPhone(to);
  const client = initAfricasTalking();

  const timestamp = new Date().toISOString();
  const alertRecord = {
    channel: 'sms',
    recipient: formattedPhone,
    message,
    sentAt: timestamp,
    meta,
    isSandbox: AT_USERNAME === 'sandbox',
    status: 'sent',
    provider: "Africa's Talking"
  };

  if (client && AT_API_KEY && AT_API_KEY !== 'YOUR_AFRICAS_TALKING_API_KEY') {
    try {
      const options = {
        to: [formattedPhone],
        message: message,
        ...(AT_SENDER_ID && AT_USERNAME !== 'sandbox' ? { from: AT_SENDER_ID } : {})
      };

      console.log(`[SMS Service] Dispatching via Africa's Talking to ${formattedPhone}...`);
      const response = await client.send(options);
      
      const recipients = response?.SMSMessageData?.Recipients || [];
      const recipientResult = recipients[0] || {};

      alertRecord.providerResponse = response;
      alertRecord.status = recipientResult.status === 'Success' ? 'delivered' : 'sent';
      alertRecord.messageId = recipientResult.messageId || 'at-' + Date.now();
      alertRecord.cost = recipientResult.cost || 'UGX 0';

      console.log(`[SMS Service] Africa's Talking API Response:`, JSON.stringify(recipientResult));
      return {
        success: true,
        alertRecord,
        rawResponse: response
      };
    } catch (err) {
      console.error(`[SMS Service] Africa's Talking API Error: ${err.message}`);
      alertRecord.status = 'failed';
      alertRecord.errorMessage = err.message;

      return {
        success: false,
        alertRecord,
        error: err.message
      };
    }
  } else {
    // Simulated delivery for offline development, judge demos without active balance, or sandbox preview
    console.log(`\n================== [SMS SIMULATOR: AFRICA'S TALKING] ==================`);
    console.log(`To:        ${formattedPhone} (Uganda)`);
    console.log(`From:      Nankwanya [AT Sandbox: ${AT_USERNAME}]`);
    console.log(`Message:   "${message}"`);
    console.log(`Timestamp: ${timestamp}`);
    console.log(`Metadata:  `, JSON.stringify(meta));
    console.log(`========================================================================\n`);

    alertRecord.messageId = `sim-at-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    alertRecord.status = 'delivered'; // simulated instant delivery
    alertRecord.isSimulated = true;

    return {
      success: true,
      alertRecord,
      simulated: true
    };
  }
}

/**
 * Format blood request alert text
 * @param {Object} params
 * @param {string} params.bloodType - Blood type needed (e.g. 'B+')
 * @param {string} params.facilityName - Name of hospital
 * @param {string} [params.urgency] - 'urgent' | 'critical' | 'normal'
 * @returns {string}
 */
function composeBloodAlertMessage({ bloodType, facilityName, urgency = 'urgent' }) {
  const urgencyPrefix = urgency.toLowerCase() === 'critical' ? 'CRITICAL EMERGENCY' : 'Urgent need';
  return `${urgencyPrefix} for ${bloodType} blood at ${facilityName}. Reply YES if available to donate today. - Nankwanya`;
}

module.exports = {
  sendSMS,
  normalizeUgandaPhone,
  composeBloodAlertMessage,
  AT_USERNAME
};
