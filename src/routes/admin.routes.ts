import { Elysia, t } from 'elysia';
import { logger } from '@/utils/logger';
import { conversationRepository, orderRepository } from '@/repositories';
import { whatsappService } from '@/services';
import { OrderStatus } from '@/domain/types';

/**
 * Admin Routes (for internal use/dashboard)
 * In production, protect these with authentication
 */
export const adminRoutes = new Elysia({ prefix: '/admin' })
  /**
   * Get all orders
   */
  .get(
    '/orders',
    async ({ query }) => {
      const status = query.status as OrderStatus | undefined;
      const limit = query.limit ? parseInt(query.limit) : 50;

      if (status) {
        const orders = await orderRepository.findByStatus(status, limit);
        return { orders, count: orders.length };
      }

      // Get recent orders
      const orders = await orderRepository.find({}, { 
        sort: { createdAt: -1 }, 
        limit 
      });
      
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
      const order = await orderRepository.findByOrderId(params.orderId);
      
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
      
      const order = await orderRepository.updateStatus(params.orderId, status);
      
      if (!order) {
        return new Response('Order not found', { status: 404 });
      }

      // Notify customer of status change
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
      const orders = await orderRepository.findByPhoneNumber(params.phone);
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
      const conversation = await conversationRepository.findByPhoneNumber(params.phone);
      
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
      const conversation = await conversationRepository.resetConversation(params.phone);
      
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

