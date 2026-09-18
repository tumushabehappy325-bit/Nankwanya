/**
 * Pandora SMS Gateway Service for Nankwanya
 *
 * One-way SMS notifications to Ugandan donors.
 * Uses Pandora SMS API.
 */

require('dotenv').config();

const PANDORA_API_URL =
  process.env.PANDORA_API_URL ||
  'https://www.sms.thepandoranetworks.com/API/send_sms/';

const PANDORA_USERNAME = process.env.PANDORA_USERNAME || '';
const PANDORA_PASSWORD = process.env.PANDORA_PASSWORD || '';
const PANDORA_SENDER_ID = process.env.PANDORA_SENDER_ID || 'Nankwanya';

const PANDORA_MESSAGE_TYPE =
  process.env.PANDORA_MESSAGE_TYPE || 'non_customised';

const PANDORA_MESSAGE_CATEGORY =
  process.env.PANDORA_MESSAGE_CATEGORY || 'bulk';

const NANKWANYA_CONFIRM_PHONE =
  process.env.NANKWANYA_CONFIRM_PHONE || '0800 122 422';

function getPandoraErrorMessage(data, fallback) {
  if (data?.error_message) return data.error_message;
  if (Array.isArray(data?.messages) && data.messages.length > 0) {
    return data.messages.join('; ');
  }
  if (data?.message) return data.message;
  return fallback;
}

/**
 * Normalize Ugandan phone numbers to Pandora format.
 *
 * Examples:
 * 0770000000  -> 256770000000
 * +256770000000 -> 256770000000
 * 256770000000 -> 256770000000
 */
function normalizeUgandaPhone(phone) {
  if (!phone) return '';

  let cleaned = String(phone).replace(/\D/g, '');

  if (cleaned.startsWith('0')) {
    cleaned = '256' + cleaned.substring(1);
  } else if (!cleaned.startsWith('256')) {
    cleaned = '256' + cleaned;
  }

  return /^256\d{9}$/.test(cleaned) ? cleaned : '';
}

/**
 * Send an SMS through Pandora.
 */
async function sendSMS({ to, message, meta = {} }) {
  const formattedPhone = normalizeUgandaPhone(to);
  const timestamp = new Date().toISOString();

  if (!formattedPhone) {
    return {
      success: false,
      error: 'Invalid recipient phone number'
    };
  }

  if (!PANDORA_USERNAME || !PANDORA_PASSWORD) {
    console.warn(
      '[SMS Service] Pandora credentials are not configured.'
    );

    return {
      success: false,
      error: 'Pandora SMS credentials are not configured'
    };
  }

  if (!message || message.length > 160) {
    return {
      success: false,
      error: 'SMS message must contain between 1 and 160 characters'
    };
  }

  const alertRecord = {
    channel: 'sms',
    recipient: formattedPhone,
    message,
    sentAt: timestamp,
    meta,
    status: 'pending',
    provider: 'Pandora SMS'
  };

  try {
    const parameters = new URLSearchParams();

    parameters.append('number', formattedPhone);
    parameters.append('message', message);
    parameters.append('sender', PANDORA_SENDER_ID);
    parameters.append('username', PANDORA_USERNAME);
    parameters.append('password', PANDORA_PASSWORD);
    parameters.append('message_type', PANDORA_MESSAGE_TYPE);
    parameters.append('message_category', PANDORA_MESSAGE_CATEGORY);

    console.log(
      `[SMS Service] Sending Pandora SMS to ${formattedPhone}...`
    );

    const response = await fetch(PANDORA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: parameters.toString()
    });

    const responseText = await response.text();
    let data;

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      data = {
        success: false,
        error_message: responseText || parseError.message
      };
    }

    alertRecord.providerResponse = data;

    if (!response.ok) {
      alertRecord.status = 'failed';
      alertRecord.errorMessage = getPandoraErrorMessage(
        data,
        `Pandora SMS API returned HTTP ${response.status}`
      );

      return {
        success: false,
        alertRecord,
        error: alertRecord.errorMessage
      };
    }

    if (data.success === true || data.success === 'true') {
      alertRecord.status = 'sent';
      alertRecord.messageId = data.message_id || data.messageId || `pandora-${Date.now()}`;

      console.log(
        `[SMS Service] Pandora SMS sent successfully to ${formattedPhone}`
      );

      return {
        success: true,
        alertRecord,
        rawResponse: data
      };
    }

    alertRecord.status = 'failed';
    alertRecord.errorMessage = getPandoraErrorMessage(
      data,
      'Pandora SMS API returned an error'
    );

    console.error(
      '[SMS Service] Pandora API Error:',
      alertRecord.errorMessage
    );

    return {
      success: false,
      alertRecord,
      error: alertRecord.errorMessage
    };

  } catch (error) {
    alertRecord.status = 'failed';
    alertRecord.errorMessage = error.message;

    console.error(
      '[SMS Service] Pandora connection error:',
      error.message
    );

    return {
      success: false,
      alertRecord,
      error: error.message
    };
  }
}

/**
 * Compose a blood donation alert.
 *
 * This is ONE-WAY SMS.
 * Donors do not reply by SMS.
 */
function composeBloodAlertMessage({
  bloodType,
  facilityName,
  urgency = 'urgent',
  donorName,
  distanceKm,
  confirmPhone = NANKWANYA_CONFIRM_PHONE
}) {
  const urgencyText =
    urgency.toLowerCase() === 'critical'
      ? 'critically'
      : 'urgently';

  const nameParts = donorName
    ? String(donorName).trim().split(/\s+/).filter(Boolean)
    : [];

  const displayName = nameParts[1] || nameParts[0] || 'Donor';

  const distanceText = Number.isFinite(Number(distanceKm))
    ? `, ${Number(distanceKm).toFixed(1)}km away`
    : '';

  return `🩸 NANKWANYA: Hello ${displayName}, ${bloodType} blood is ${urgencyText} needed at ${facilityName}${distanceText}. Call ${confirmPhone} or open Nankwanya app to confirm.`;
}

module.exports = {
  sendSMS,
  normalizeUgandaPhone,
  composeBloodAlertMessage
};
