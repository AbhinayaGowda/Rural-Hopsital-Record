import axios from 'axios';
import { logger } from './logger.js';

const ENABLED = process.env.ENABLE_SMS === 'true';
const API_KEY  = process.env.MSG91_API_KEY  || '';
const SENDER   = process.env.MSG91_SENDER   || 'HOSPTL';
const ROUTE    = process.env.MSG91_ROUTE    || '4'; // transactional

/**
 * Send a plain-text SMS via MSG91.
 * Returns { success, externalId, error }.
 */
export async function sendSms(phoneNumber, message) {
  if (!ENABLED) {
    logger.info(`[SMS disabled] To ${phoneNumber}: ${message}`);
    return { success: true, externalId: null };
  }

  if (!API_KEY) {
    logger.warn('ENABLE_SMS=true but MSG91_API_KEY not set — skipping SMS');
    return { success: false, error: 'No API key' };
  }

  try {
    const res = await axios.post(
      'https://api.msg91.com/api/v5/flow/',
      {
        template_id: process.env.MSG91_TEMPLATE_ID || '',
        short_url:   '0',
        mobiles:     phoneNumber.replace(/\D/g, ''),
        message,
        authkey:     API_KEY,
        sender:      SENDER,
        route:       ROUTE,
      },
      { timeout: 8000 },
    );

    const externalId = res.data?.request_id || null;
    return { success: true, externalId };
  } catch (err) {
    logger.error(`SMS send failed to ${phoneNumber}: ${err.message}`);
    return { success: false, error: err.message };
  }
}
