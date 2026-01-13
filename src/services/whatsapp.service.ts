import axios, { AxiosInstance } from 'axios';
import { config } from '@/config/env';
import { logger } from '@/utils/logger';
import type { WhatsAppButton, WhatsAppProductSection } from '@/domain/types';

/**
 * WhatsApp Cloud API Service
 */
export class WhatsAppService {
  private readonly api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: `${config.whatsapp.apiUrl}/${config.whatsapp.phoneNumberId}`,
      headers: {
        'Authorization': `Bearer ${config.whatsapp.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Send a text message
   */
  async sendTextMessage(to: string, text: string): Promise<void> {
    try {
      await this.api.post('/messages', {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: text },
      });
      
      logger.info({ to }, '✅ Text message sent');
    } catch (error) {
      logger.error({ error, to }, '❌ Failed to send text message');
      throw error;
    }
  }

  /**
   * Send a message with interactive buttons
   */
  async sendButtonMessage(
    to: string,
    bodyText: string,
    buttons: WhatsAppButton[]
  ): Promise<void> {
    try {
      await this.api.post('/messages', {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: bodyText },
          action: {
            buttons: buttons.map((btn) => ({
              type: 'reply',
              reply: {
                id: btn.id,
                title: btn.title.substring(0, 20), // Max 20 chars
              },
            })),
          },
        },
      });
      
      logger.info({ to }, '✅ Button message sent');
    } catch (error) {
      logger.error({ error, to }, '❌ Failed to send button message');
      throw error;
    }
  }

  /**
   * Send catalog message (opens the full catalog)
   */
  async sendCatalogMessage(to: string, bodyText?: string): Promise<void> {
    try {
      await this.api.post('/messages', {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'catalog_message',
          body: {
            text: bodyText || 'Browse our beautiful collection! Tap on items to view details and add to cart.',
          },
          action: {
            name: 'catalog_message',
          },
        },
      });
      
      logger.info({ to }, '✅ Catalog message sent');
    } catch (error) {
      logger.error({ error, to }, '❌ Failed to send catalog message');
      throw error;
    }
  }

  /**
   * Send a single product message
   */
  async sendProductMessage(
    to: string,
    productRetailerId: string,
    bodyText?: string
  ): Promise<void> {
    try {
      await this.api.post('/messages', {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'product',
          body: {
            text: bodyText || 'Check out this item!',
          },
          action: {
            catalog_id: config.whatsapp.catalogId,
            product_retailer_id: productRetailerId,
          },
        },
      });
      
      logger.info({ to, productRetailerId }, '✅ Product message sent');
    } catch (error) {
      logger.error({ error, to }, '❌ Failed to send product message');
      throw error;
    }
  }

  /**
   * Send a product list message
   */
  async sendProductListMessage(
    to: string,
    headerText: string,
    bodyText: string,
    sections: WhatsAppProductSection[]
  ): Promise<void> {
    try {
      await this.api.post('/messages', {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'product_list',
          header: {
            type: 'text',
            text: headerText,
          },
          body: {
            text: bodyText,
          },
          action: {
            catalog_id: config.whatsapp.catalogId,
            sections,
          },
        },
      });
      
      logger.info({ to }, '✅ Product list message sent');
    } catch (error) {
      logger.error({ error, to }, '❌ Failed to send product list message');
      throw error;
    }
  }

  /**
   * Send a list message (interactive list with selectable items)
   */
  async sendListMessage(
    to: string,
    headerText: string,
    bodyText: string,
    buttonText: string,
    sections: Array<{
      title: string;
      rows: Array<{
        id: string;
        title: string;
        description?: string;
      }>;
    }>
  ): Promise<void> {
    try {
      await this.api.post('/messages', {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'list',
          header: {
            type: 'text',
            text: headerText,
          },
          body: {
            text: bodyText,
          },
          action: {
            button: buttonText,
            sections,
          },
        },
      });
      
      logger.info({ to }, '✅ List message sent');
    } catch (error) {
      logger.error({ error, to }, '❌ Failed to send list message');
      throw error;
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    try {
      await this.api.post('/messages', {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      });
    } catch (error) {
      // Don't throw - read receipts are not critical
      logger.warn({ error, messageId }, '⚠️ Failed to mark message as read');
    }
  }

  /**
   * Send template message (for notifications outside 24h window)
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string,
    components?: Array<{
      type: 'header' | 'body' | 'button';
      parameters: Array<{
        type: 'text' | 'currency' | 'date_time';
        text?: string;
      }>;
    }>
  ): Promise<void> {
    try {
      await this.api.post('/messages', {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode,
          },
          components,
        },
      });
      
      logger.info({ to, templateName }, '✅ Template message sent');
    } catch (error) {
      logger.error({ error, to, templateName }, '❌ Failed to send template message');
      throw error;
    }
  }
}

// Singleton instance
export const whatsappService = new WhatsAppService();

