/**
 * Payment Link Create Options
 */
export interface CreatePaymentLinkOptions {
  amount: number; // In rupees
  customerPhone: string;
  customerName: string;
  orderId: string;
  description: string;
}

/**
 * Payment Link Response
 */
export interface PaymentLinkResponse {
  id: string;
  shortUrl: string;
  amount: number;
  status: string;
}

/**
 * Razorpay Payment Link Entity
 */
export interface RazorpayPaymentLink {
  id: string;
  amount: number;
  currency: string;
  accept_partial: boolean;
  reference_id: string;
  description: string;
  short_url: string;
  status: string;
  created_at: number;
  expire_by?: number;
}

/**
 * Razorpay Webhook Event
 */
export type RazorpayWebhookEvent = 
  | 'payment_link.created'
  | 'payment_link.paid'
  | 'payment_link.expired'
  | 'payment_link.cancelled'
  | 'payment.captured'
  | 'payment.failed';

/**
 * Razorpay Payment Link Webhook Entity
 */
export interface RazorpayPaymentLinkWebhookEntity {
  id: string;
  amount: number;
  currency: string;
  status: string;
  reference_id: string;
  short_url: string;
  payments?: Array<{
    payment_id: string;
    amount: number;
    status: string;
    method: string;
  }>;
}

/**
 * Razorpay Webhook Payload
 */
export interface RazorpayWebhookPayload {
  event: RazorpayWebhookEvent;
  payload: {
    payment_link?: {
      entity: RazorpayPaymentLinkWebhookEntity;
    };
    payment?: {
      entity: {
        id: string;
        amount: number;
        currency: string;
        status: string;
        method: string;
        order_id?: string;
      };
    };
  };
  created_at: number;
}

