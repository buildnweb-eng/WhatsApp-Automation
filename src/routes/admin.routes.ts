import { Elysia, t } from 'elysia';
import { logger } from '@/utils/logger';
import { OrderModel } from '@/domain/models/order.model';
import { ConversationModel } from '@/domain/models/conversation.model';
import { WhatsAppService } from '@/services/whatsapp.service';
import { OrderStatus } from '@/domain/types';

// Legacy single-tenant WhatsApp service (for backward compatibility)
const whatsappService = new WhatsAppService();

/**
 * Admin Routes (LEGACY - for single-tenant use)
 * For multi-tenant, use /api/tenants/:tenantId/* endpoints instead
 * In production, protect these with authentication
 */
export const adminRoutes = new Elysia({ prefix: '/admin' })
  /**
   * Get all orders (across all tenants - for platform admin)
   */
  .get(
    '/orders',
    async ({ query }) => {
      const status = query.status as OrderStatus | undefined;
      const limit = query.limit ? parseInt(query.limit) : 50;

      const filter: Record<string, unknown> = {};
      if (status) {
        filter.status = status;
      }

      const orders = await OrderModel.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return { orders, count: orders.length };
    },
    {
      query: t.Object({
        status: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )

  /**
   * Get order by ID
   */
  .get(
    '/orders/:orderId',
    async ({ params }) => {
      const order = await OrderModel.findOne({ orderId: params.orderId }).lean();

      if (!order) {
        return new Response('Order not found', { status: 404 });
      }

      return order;
    },
    {
      params: t.Object({
        orderId: t.String(),
      }),
    }
  )

  /**
   * Update order status
   */
  .patch(
    '/orders/:orderId/status',
    async ({ params, body }) => {
      const { status } = body as { status: OrderStatus };

      const order = await OrderModel.findOneAndUpdate(
        { orderId: params.orderId },
        { status, updatedAt: new Date() },
        { new: true }
      ).lean();

      if (!order) {
        return new Response('Order not found', { status: 404 });
      }

      // Note: For multi-tenant, use tenant-specific WhatsApp service
      // This legacy route uses default config
      try {
        if (status === OrderStatus.SHIPPED) {
          await whatsappService.sendTextMessage(
            order.phoneNumber,
            `📦 Your order ${order.orderId} has been shipped! You'll receive tracking details soon.`
          );
        }

        if (status === OrderStatus.DELIVERED) {
          await whatsappService.sendTextMessage(
            order.phoneNumber,
            `✅ Your order ${order.orderId} has been delivered! Thank you for shopping with us. 🙏`
          );
        }
      } catch (error) {
        logger.warn({ error, orderId: params.orderId }, 'Failed to send status update message');
      }

      return order;
    },
    {
      params: t.Object({
        orderId: t.String(),
      }),
      body: t.Object({
        status: t.String(),
      }),
    }
  )

  /**
   * Get orders by phone number
   */
  .get(
    '/customers/:phone/orders',
    async ({ params }) => {
      const orders = await OrderModel.find({ phoneNumber: params.phone })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
      return { orders, count: orders.length };
    },
    {
      params: t.Object({
        phone: t.String(),
      }),
    }
  )

  /**
   * Get conversation by phone number
   */
  .get(
    '/conversations/:phone',
    async ({ params }) => {
      const conversation = await ConversationModel.findOne({ phoneNumber: params.phone }).lean();

      if (!conversation) {
        return new Response('Conversation not found', { status: 404 });
      }

      return conversation;
    },
    {
      params: t.Object({
        phone: t.String(),
      }),
    }
  )

  /**
   * Reset conversation (for support)
   */
  .post(
    '/conversations/:phone/reset',
    async ({ params }) => {
      const conversation = await ConversationModel.findOneAndUpdate(
        { phoneNumber: params.phone },
        {
          state: 'BROWSING',
          cart: undefined,
          address: undefined,
          orderId: undefined,
          paymentLinkId: undefined,
          paymentLinkUrl: undefined,
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        },
        { new: true }
      ).lean();

      if (!conversation) {
        return new Response('Conversation not found', { status: 404 });
      }

      logger.info({ phone: params.phone }, '🔄 Conversation reset by admin');
      return conversation;
    },
    {
      params: t.Object({
        phone: t.String(),
      }),
    }
  )

  /**
   * Send manual message (for support)
   * Note: Uses default WhatsApp config - for multi-tenant use tenant routes
   */
  .post(
    '/send-message',
    async ({ body }) => {
      const { phone, message } = body as { phone: string; message: string };

      await whatsappService.sendTextMessage(phone, message);

      logger.info({ phone }, '📤 Manual message sent by admin');
      return { success: true };
    },
    {
      body: t.Object({
        phone: t.String(),
        message: t.String(),
      }),
    }
  );
