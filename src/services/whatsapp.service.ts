import axios, { AxiosInstance } from 'axios';
import { config } from '@/config/env';
import { logger } from '@/utils/logger';
import type { WhatsAppButton, WhatsAppProductSection } from '@/domain/types';
import type { WhatsAppConfig } from '@/domain/types/tenant.types';

/**
 * WhatsApp Cloud API Service
 * Can be instantiated with tenant-specific config or use global config
 */
export class WhatsAppService {
  private readonly api: AxiosInstance;
  private readonly serviceConfig: WhatsAppConfig;
  private readonly businessPhone: string;

  constructor(tenantConfig?: { whatsapp: WhatsAppConfig; businessPhone: string }) {
    // Use tenant config if provided, otherwise fall back to global config
    if (tenantConfig) {
      this.serviceConfig = tenantConfig.whatsapp;
      this.businessPhone = tenantConfig.businessPhone;
      this.api = axios.create({
        baseURL: `${tenantConfig.whatsapp.apiUrl}/${tenantConfig.whatsapp.phoneNumberId}`,
        headers: {
          'Authorization': `Bearer ${tenantConfig.whatsapp.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
    } else {
      // Legacy: use global config for backward compatibility
      this.serviceConfig = {
        apiUrl: config.whatsapp.apiUrl,
        phoneNumberId: config.whatsapp.phoneNumberId,
        businessAccountId: config.whatsapp.businessAccountId || '',
        accessToken: config.whatsapp.accessToken,
        verifyToken: config.whatsapp.verifyToken,
        catalogId: config.whatsapp.catalogId,
        apiVersion: 'v18.0',
      };
      this.businessPhone = config.business.phone;
      this.api = axios.create({
        baseURL: `${config.whatsapp.apiUrl}/${config.whatsapp.phoneNumberId}`,
        headers: {
          'Authorization': `Bearer ${config.whatsapp.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
    }
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
   * Requires at least one product retailer ID to use as thumbnail
   */
  async sendCatalogMessage(to: string, bodyText?: string, thumbnailProductId?: string): Promise<void> {
    try {
      // If no thumbnail product ID is provided, send instructions instead
      if (!thumbnailProductId) {
        // Generate catalog link (clean phone number by removing + sign)
        const phone = this.businessPhone.replace('+', '');
        const catalogLink = `https://wa.me/c/${phone}`;

        await this.api.post('/messages', {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: {
            body: bodyText ||
              '🛍️ *Browse Our Collection*\n\n' +
              'Tap the link below to view our full catalog:\n' +
              `${catalogLink}\n\n` +
              '_Browse items and add them to your cart!_ ✨'
          },
        });
        logger.info({ to }, '✅ Catalog link sent (fallback)');
        return;
      }

      // Send actual catalog_message with thumbnail
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
            parameters: {
              thumbnail_product_retailer_id: thumbnailProductId,
            },
          },
        },
      });

      logger.info({ to, thumbnailProductId }, '✅ Catalog message sent');
    } catch (error) {
      logger.error({ error, to }, '❌ Failed to send catalog message');
      throw error;
    }
  }

  /**
   * Send product carousel message (horizontal scrolling product cards)
   * Requires 2-10 product retailer IDs from your catalog
   */
  async sendProductCarousel(
    to: string,
    bodyText: string,
    productRetailerIds: string[]
  ): Promise<void> {
    if (productRetailerIds.length < 2 || productRetailerIds.length > 10) {
      throw new Error('Product carousel requires 2-10 product IDs');
    }

    try {
      const cards = productRetailerIds.map((productId, index) => ({
        card_index: index,
        components: [
          {
            type: 'body',
            parameters: [
              {
                type: 'product',
                product: {
                  product_retailer_id: productId,
                  catalog_id: this.serviceConfig.catalogId,
                },
              },
            ],
          },
        ],
      }));

      await this.api.post('/messages', {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'product_carousel',
          body: {
            text: bodyText,
          },
          cards,
        },
      });

      logger.info({ to, productCount: productRetailerIds.length }, '✅ Product carousel sent');
    } catch (error) {
      logger.error({ error, to }, '❌ Failed to send product carousel');
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
            catalog_id: this.serviceConfig.catalogId,
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
            catalog_id: this.serviceConfig.catalogId,
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

