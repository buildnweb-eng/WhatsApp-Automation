import { Elysia, t } from 'elysia';
import { config } from '@/config/env';
import { logger } from '@/utils/logger';
import { messageHandler } from '@/handlers';
import type {
  WhatsAppWebhookPayload,
  WhatsAppIncomingMessage,
  WhatsAppContact,
  ProcessedMessageContext,
} from '@/domain/types';

/**
 * WhatsApp Webhook Routes
 */
export const whatsappRoutes = new Elysia({ prefix: '/webhook/whatsapp' })
  /**
   * Webhook Verification (GET)
   * Called by Meta to verify your webhook URL during setup
   */
  .get(
    '/',
    ({ query }) => {
      const mode = query['hub.mode'];
      const token = query['hub.verify_token'];
      const challenge = query['hub.challenge'];

      logger.info({ mode, hasToken: !!token }, 'Webhook verification request');

      if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
        logger.info('✅ Webhook verified successfully');
        return challenge;
      }

      logger.warn('❌ Webhook verification failed');
      return new Response('Forbidden', { status: 403 });
    },
    {
      query: t.Object({
        'hub.mode': t.Optional(t.String()),
        'hub.verify_token': t.Optional(t.String()),
        'hub.challenge': t.Optional(t.String()),
      }),
    }
  )
  
  /**
   * Webhook Handler (POST)
   * Receives all incoming messages and events from WhatsApp
   */
  .post(
    '/',
    async ({ body }) => {
      try {
        const payload = body as WhatsAppWebhookPayload;

        // Validate payload structure
        if (payload.object !== 'whatsapp_business_account') {
          logger.warn({ object: payload.object }, '⚠️ Unknown webhook object');
          return { status: 'ignored' };
        }

        // Process entries
        for (const entry of payload.entry || []) {
          for (const change of entry.changes || []) {
            if (change.field !== 'messages') continue;

            const value = change.value;
            const messages = value.messages || [];
            const contacts = value.contacts || [];

            // Process each message
            for (let i = 0; i < messages.length; i++) {
              const message = messages[i] as WhatsAppIncomingMessage;
              const contact = contacts[i] as WhatsAppContact | undefined;

              const context: ProcessedMessageContext = {
                from: message.from,
                name: contact?.profile?.name,
                type: message.type,
                message,
                timestamp: new Date(parseInt(message.timestamp) * 1000),
              };

              // Process asynchronously - don't block the webhook response
              messageHandler.processMessage(context).catch((error) => {
                logger.error({ error, from: message.from }, '❌ Message processing failed');
              });
            }
          }
        }

        // Always return 200 quickly to acknowledge receipt
        return { status: 'ok' };
      } catch (error) {
        logger.error({ error }, '❌ Webhook processing error');
        // Still return 200 to prevent Meta from retrying
        return { status: 'ok' };
      }
    },
    {
      body: t.Any(),
    }
  );

