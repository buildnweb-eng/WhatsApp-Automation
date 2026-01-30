import type { WhatsAppLocationMessage } from './location.types';

// Re-export for convenience
export type { WhatsAppLocationMessage } from './location.types';

/**
 * WhatsApp Message Types
 */
export type WhatsAppMessageType =
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'sticker'
  | 'location'
  | 'contacts'
  | 'interactive'
  | 'order'
  | 'button'
  | 'reaction';

/**
 * WhatsApp Text Message
 */
export interface WhatsAppTextMessage {
  body: string;
}

/**
 * WhatsApp Order Product Item
 */
export interface WhatsAppOrderProductItem {
  product_retailer_id: string;
  quantity: number;
  item_price: number; // In paise
  currency: string;
}

/**
 * WhatsApp Order Message
 */
export interface WhatsAppOrderMessage {
  catalog_id: string;
  product_items: WhatsAppOrderProductItem[];
  text?: string;
}

/**
 * WhatsApp Button Reply
 */
export interface WhatsAppButtonReply {
  id: string;
  title: string;
}

/**
 * WhatsApp List Reply
 */
export interface WhatsAppListReply {
  id: string;
  title: string;
  description?: string;
}

/**
 * WhatsApp Interactive Message
 */
export interface WhatsAppInteractiveMessage {
  type: 'button_reply' | 'list_reply';
  button_reply?: WhatsAppButtonReply;
  list_reply?: WhatsAppListReply;
}

/**
 * WhatsApp Contact Profile
 */
export interface WhatsAppContactProfile {
  name: string;
}

/**
 * WhatsApp Contact
 */
export interface WhatsAppContact {
  profile: WhatsAppContactProfile;
  wa_id: string;
}

/**
 * WhatsApp Incoming Message
 */
export interface WhatsAppIncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: WhatsAppMessageType;
  text?: WhatsAppTextMessage;
  order?: WhatsAppOrderMessage;
  interactive?: WhatsAppInteractiveMessage;
  location?: WhatsAppLocationMessage;
}

/**
 * WhatsApp Webhook Value
 */
export interface WhatsAppWebhookValue {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: WhatsAppContact[];
  messages?: WhatsAppIncomingMessage[];
  statuses?: Array<{
    id: string;
    status: string;
    timestamp: string;
    recipient_id: string;
  }>;
}

/**
 * WhatsApp Webhook Change
 */
export interface WhatsAppWebhookChange {
  value: WhatsAppWebhookValue;
  field: string;
}

/**
 * WhatsApp Webhook Entry
 */
export interface WhatsAppWebhookEntry {
  id: string;
  changes: WhatsAppWebhookChange[];
}

/**
 * WhatsApp Webhook Payload
 */
export interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppWebhookEntry[];
}

/**
 * Processed Message Context - Multi-tenant aware
 */
export interface ProcessedMessageContext {
  from: string;
  name?: string;
  type: WhatsAppMessageType;
  message: WhatsAppIncomingMessage;
  timestamp: Date;
  // Tenant context (from webhook metadata)
  tenantId: string;
  phoneNumberId: string;
}

/**
 * WhatsApp Button
 */
export interface WhatsAppButton {
  id: string;
  title: string;
}

/**
 * WhatsApp Product Section
 */
export interface WhatsAppProductSection {
  title: string;
  product_items: Array<{ product_retailer_id: string }>;
}

