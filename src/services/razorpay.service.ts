import Razorpay from 'razorpay';
import crypto from 'crypto';
import { config } from '@/config/env';
import { logger } from '@/utils/logger';
import type { CreatePaymentLinkOptions, PaymentLinkResponse } from '@/domain/types';
import type { RazorpayConfig } from '@/domain/types/tenant.types';

/**
 * Razorpay Payment Service
 * Can be instantiated with tenant-specific config or use global config
 */
export class RazorpayService {
  private readonly razorpay: Razorpay;
  private readonly serviceConfig: RazorpayConfig;
  private readonly appUrl: string;

  constructor(tenantConfig?: { razorpay: RazorpayConfig; appUrl?: string }) {
    if (tenantConfig) {
      this.serviceConfig = tenantConfig.razorpay;
      this.appUrl = tenantConfig.appUrl || config.app.url;
      this.razorpay = new Razorpay({
        key_id: tenantConfig.razorpay.keyId,
        key_secret: tenantConfig.razorpay.keySecret,
      });
    } else {
      // Legacy: use global config for backward compatibility
      this.serviceConfig = {
        keyId: config.razorpay.keyId,
        keySecret: config.razorpay.keySecret,
        webhookSecret: config.razorpay.webhookSecret,
      };
      this.appUrl = config.app.url;
      this.razorpay = new Razorpay({
        key_id: config.razorpay.keyId,
        key_secret: config.razorpay.keySecret,
      });
    }
  }

  /**
   * Create a payment link
   */
  async createPaymentLink(options: CreatePaymentLinkOptions): Promise<PaymentLinkResponse> {
    try {
      // Convert rupees to paise
      const amountInPaise = Math.round(options.amount * 100);

      const paymentLink = await this.razorpay.paymentLink.create({
        amount: amountInPaise,
        currency: 'INR',
        accept_partial: false,
        reference_id: options.orderId,
        description: options.description,
        customer: {
          name: options.customerName,
          contact: this.formatPhoneNumber(options.customerPhone),
        },
        notify: {
          sms: false, // We send our own notifications
          email: false,
        },
        reminder_enable: true,
        notes: {
          order_id: options.orderId,
          phone: options.customerPhone,
        },
        callback_url: `${this.appUrl}/payment/success`,
        callback_method: 'get',
        expire_by: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
      });

      logger.info(
        { orderId: options.orderId, paymentLinkId: paymentLink.id },
        '✅ Payment link created'
      );

      return {
        id: paymentLink.id,
        shortUrl: paymentLink.short_url,
        amount: options.amount,
        status: paymentLink.status,
      };
    } catch (error) {
      logger.error({ error, options }, '❌ Failed to create payment link');
      throw error;
    }
  }

  /**
   * Fetch payment link details
   */
  async getPaymentLink(paymentLinkId: string): Promise<unknown> {
    try {
      return await this.razorpay.paymentLink.fetch(paymentLinkId);
    } catch (error) {
      logger.error({ error, paymentLinkId }, '❌ Failed to fetch payment link');
      throw error;
    }
  }

  /**
   * Cancel a payment link
   */
  async cancelPaymentLink(paymentLinkId: string): Promise<void> {
    try {
      await this.razorpay.paymentLink.cancel(paymentLinkId);
      logger.info({ paymentLinkId }, '✅ Payment link cancelled');
    } catch (error) {
      logger.error({ error, paymentLinkId }, '❌ Failed to cancel payment link');
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(body: string, signature: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.serviceConfig.webhookSecret)
        .update(body)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      logger.error({ error }, '❌ Webhook signature verification failed');
      return false;
    }
  }

  /**
   * Format phone number for Razorpay
   */
  private formatPhoneNumber(phone: string): string {
    // Ensure phone has + prefix
    if (!phone.startsWith('+')) {
      return `+${phone}`;
    }
    return phone;
  }

  /**
   * Initiate refund
   */
  async initiateRefund(
    paymentId: string,
    amount?: number,
    notes?: Record<string, string>
  ): Promise<unknown> {
    try {
      const refundData: Record<string, unknown> = {};
      
      if (amount) {
        refundData.amount = Math.round(amount * 100); // Convert to paise
      }
      
      if (notes) {
        refundData.notes = notes;
      }

      const refund = await this.razorpay.payments.refund(paymentId, refundData);
      
      logger.info({ paymentId, refundId: refund.id }, '✅ Refund initiated');
      return refund;
    } catch (error) {
      logger.error({ error, paymentId }, '❌ Failed to initiate refund');
      throw error;
    }
  }
}

// Singleton instance
export const razorpayService = new RazorpayService();

