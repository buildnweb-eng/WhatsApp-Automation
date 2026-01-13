import { Elysia, t } from 'elysia';
import { logger } from '@/utils/logger';
import { razorpayService } from '@/services';
import { orderHandler } from '@/handlers';
import type { RazorpayWebhookPayload } from '@/domain/types';

/**
 * Razorpay Webhook Routes
 */
export const razorpayRoutes = new Elysia({ prefix: '/webhook/razorpay' })
  /**
   * Payment Webhook Handler
   * Receives payment events from Razorpay
   */
  .post(
    '/',
    async ({ body, headers, request }) => {
      try {
        const signature = headers['x-razorpay-signature'];
        
        if (!signature) {
          logger.warn('⚠️ Missing Razorpay webhook signature');
          return new Response('Bad Request', { status: 400 });
        }

        // Get raw body for signature verification
        const rawBody = JSON.stringify(body);
        
        // Verify signature
        const isValid = razorpayService.verifyWebhookSignature(rawBody, signature);
        
        if (!isValid) {
          logger.warn('❌ Invalid Razorpay webhook signature');
          return new Response('Unauthorized', { status: 401 });
        }

        const payload = body as RazorpayWebhookPayload;
        logger.info({ event: payload.event }, '📥 Razorpay webhook received');

        // Handle events
        switch (payload.event) {
          case 'payment_link.paid':
            await orderHandler.handlePaymentSuccess(payload);
            break;

          case 'payment_link.expired':
            await orderHandler.handlePaymentExpired(payload);
            break;

          case 'payment_link.cancelled':
            logger.info('Payment link cancelled');
            break;

          default:
            logger.debug({ event: payload.event }, 'Unhandled Razorpay event');
        }

        return { status: 'ok' };
      } catch (error) {
        logger.error({ error }, '❌ Razorpay webhook error');
        return new Response('Internal Server Error', { status: 500 });
      }
    },
    {
      body: t.Any(),
    }
  );

