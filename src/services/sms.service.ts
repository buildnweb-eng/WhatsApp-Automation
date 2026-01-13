import axios from 'axios';
import { config } from '@/config/env';
import { logger } from '@/utils/logger';

interface SMSResult {
  success: boolean;
  provider?: 'msg91' | 'twilio' | 'simulated';
  messageId?: string;
  error?: string;
}

/**
 * SMS Notification Service
 * Supports MSG91 and Twilio providers
 */
export class SMSService {
  /**
   * Send SMS using configured provider
   */
  async sendSMS(phoneNumber: string, message: string): Promise<SMSResult> {
    // Try MSG91 first
    if (config.sms.msg91.apiKey) {
      return this.sendViaMSG91(phoneNumber, message);
    }

    // Try Twilio
    if (config.sms.twilio.accountSid) {
      return this.sendViaTwilio(phoneNumber, message);
    }

    // Simulate if no provider configured
    return this.simulateSMS(phoneNumber, message);
  }

  /**
   * Send SMS via MSG91
   */
  private async sendViaMSG91(phoneNumber: string, message: string): Promise<SMSResult> {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber, false);

      const response = await axios.post(
        'https://api.msg91.com/api/v5/flow/',
        {
          flow_id: config.sms.msg91.flowId,
          sender: config.sms.msg91.senderId,
          mobiles: formattedPhone,
          VAR1: message, // Template variable
        },
        {
          headers: {
            'authkey': config.sms.msg91.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info({ phoneNumber, provider: 'msg91' }, '✅ SMS sent via MSG91');
      
      return {
        success: true,
        provider: 'msg91',
        messageId: response.data.request_id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error, phoneNumber }, '❌ MSG91 SMS failed');
      
      return {
        success: false,
        provider: 'msg91',
        error: errorMessage,
      };
    }
  }

  /**
   * Send SMS via Twilio
   */
  private async sendViaTwilio(phoneNumber: string, message: string): Promise<SMSResult> {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber, true);
      const { accountSid, authToken, phoneNumber: fromNumber } = config.sms.twilio;

      const response = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        new URLSearchParams({
          To: formattedPhone,
          From: fromNumber!,
          Body: message,
        }),
        {
          auth: {
            username: accountSid!,
            password: authToken!,
          },
        }
      );

      logger.info({ phoneNumber, provider: 'twilio' }, '✅ SMS sent via Twilio');
      
      return {
        success: true,
        provider: 'twilio',
        messageId: response.data.sid,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error, phoneNumber }, '❌ Twilio SMS failed');
      
      return {
        success: false,
        provider: 'twilio',
        error: errorMessage,
      };
    }
  }

  /**
   * Simulate SMS (for development)
   */
  private simulateSMS(phoneNumber: string, message: string): SMSResult {
    logger.info(
      { phoneNumber, message: message.substring(0, 50) },
      '📱 SMS simulated (no provider configured)'
    );
    
    return {
      success: true,
      provider: 'simulated',
    };
  }

  /**
   * Format phone number
   */
  private formatPhoneNumber(phone: string, withPlus: boolean): string {
    // Remove any non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // Remove + if present
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    }

    return withPlus ? `+${cleaned}` : cleaned;
  }

  /**
   * Send order confirmation SMS to customer
   */
  async sendOrderConfirmation(
    phoneNumber: string,
    orderId: string,
    amount: number
  ): Promise<SMSResult> {
    const message = `Order ${orderId} confirmed! Amount: ₹${amount}. Thank you for shopping with ${config.business.name}!`;
    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Send new order notification to business owner
   */
  async sendBusinessNotification(
    customerName: string,
    orderId: string,
    amount: number,
    itemCount: number
  ): Promise<SMSResult> {
    const message = `NEW ORDER! ID: ${orderId}, Customer: ${customerName}, Amount: ₹${amount}, Items: ${itemCount}`;
    return this.sendSMS(config.business.phone, message);
  }

  /**
   * Send shipping notification
   */
  async sendShippingNotification(
    phoneNumber: string,
    orderId: string,
    trackingId?: string
  ): Promise<SMSResult> {
    const message = trackingId
      ? `Your order ${orderId} has been shipped! Track at: ${trackingId}`
      : `Your order ${orderId} has been shipped! You'll receive tracking details soon.`;
    return this.sendSMS(phoneNumber, message);
  }
}

// Singleton instance
export const smsService = new SMSService();

