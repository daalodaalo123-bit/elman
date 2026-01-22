import twilio from 'twilio';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ override: true });

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

let client: twilio.Twilio | null = null;

if (accountSid && authToken) {
  client = twilio(accountSid, authToken);
}

/**
 * Normalize phone number to E.164 format (e.g., +1234567890)
 * Handles various formats and adds country code if missing
 */
export function normalizePhoneNumber(phone: string, defaultCountryCode: string = '+1'): string | null {
  if (!phone) return null;
  
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // If it doesn't start with +, add default country code
  if (!cleaned.startsWith('+')) {
    // Remove leading zeros
    cleaned = cleaned.replace(/^0+/, '');
    cleaned = defaultCountryCode + cleaned;
  }
  
  // Basic validation - should be 10-15 digits after +
  const digits = cleaned.replace(/^\+/, '');
  if (digits.length < 10 || digits.length > 15) {
    return null;
  }
  
  return cleaned;
}

/**
 * Send SMS message to a phone number
 */
export async function sendSMS(to: string, message: string): Promise<{ success: boolean; error?: string; sid?: string }> {
  if (!client) {
    return { success: false, error: 'Twilio is not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in your .env file.' };
  }

  if (!fromNumber) {
    return { success: false, error: 'TWILIO_PHONE_NUMBER is not set in environment variables.' };
  }

  try {
    const normalizedPhone = normalizePhoneNumber(to);
    if (!normalizedPhone) {
      return { success: false, error: `Invalid phone number format: ${to}` };
    }

    const messageInstance = await client.messages.create({
      body: message,
      from: fromNumber,
      to: normalizedPhone
    });

    return { success: true, sid: messageInstance.sid };
  } catch (error: any) {
    console.error('Twilio SMS error:', error);
    return { 
      success: false, 
      error: error?.message || 'Failed to send SMS' 
    };
  }
}

/**
 * Send purchase confirmation SMS to customer
 */
export async function sendPurchaseConfirmation(
  customerPhone: string,
  receiptRef: string,
  total: number,
  items: Array<{ product_name: string; qty: number }>,
  paymentMethod: string
): Promise<{ success: boolean; error?: string }> {
  if (!customerPhone) {
    return { success: false, error: 'Customer phone number is required' };
  }

  const itemsList = items
    .map(it => `• ${it.product_name} (Qty: ${it.qty})`)
    .join('\n');

  const message = `Thank you for your purchase at Elman!\n\n` +
    `Receipt: ${receiptRef}\n` +
    `Items:\n${itemsList}\n` +
    `Total: $${total.toFixed(2)}\n` +
    `Payment: ${paymentMethod}\n\n` +
    `We appreciate your business!`;

  return await sendSMS(customerPhone, message);
}

/**
 * Send update notification to customer
 */
export async function sendUpdateNotification(
  customerPhone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  if (!customerPhone) {
    return { success: false, error: 'Customer phone number is required' };
  }

  const fullMessage = `Update from Elman:\n\n${message}\n\nThank you for being a valued customer!`;

  return await sendSMS(customerPhone, fullMessage);
}

/**
 * Check if Twilio is configured
 */
export function isTwilioConfigured(): boolean {
  return !!(accountSid && authToken && fromNumber);
}
