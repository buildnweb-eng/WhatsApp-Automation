import { logger } from '@/utils/logger';
import { conversationRepository, orderRepository } from '@/repositories';
import { serviceFactory } from '@/services/service-factory';
import { tenantResolver } from '@/services/tenant-resolver.service';
import { ConversationState, PaymentStatus, OrderStatus } from '@/domain/types';
import type { ConversationDocument } from '@/domain/models';
import type { RazorpayWebhookPayload } from '@/domain/types';
import type { TenantConfig } from '@/domain/types/tenant.types';

/**
 * Order Handler - Manages order processing, payments, and confirmations (Multi-tenant aware)
 */
export class OrderHandler {
  /**
   * Process customer address and generate payment link
   */
  async processAddress(
    from: string,
    addressText: string,
    conversation: ConversationDocument,
    tenantConfig: TenantConfig
  ): Promise<void> {
    const tenantId = tenantConfig.tenantId;
    const whatsappService = serviceFactory.getWhatsAppService(tenantConfig);
    const razorpayService = serviceFactory.getRazorpayService(tenantConfig);

    logger.info({ from, addressLength: addressText.length, tenantId }, '📍 Processing address');

    // Validate address
    if (!this.isValidAddress(addressText)) {
      await whatsappService.sendTextMessage(
        from,
        "That address seems incomplete. Please provide your full delivery address including:\n\n" +
        "• House/Flat number\n" +
        "• Street name\n" +
        "• City, State\n" +
        "• PIN code"
      );
      return;
    }

    // Ensure we have a cart
    if (!conversation.cart || conversation.cart.items.length === 0) {
      await whatsappService.sendTextMessage(
        from,
        "It seems your cart is empty. Please add items to your cart first!"
      );
      await conversationRepository.updateByPhoneNumber(tenantId, from, {
        state: ConversationState.BROWSING,
      });
      return;
    }

    // Send processing message
    await whatsappService.sendTextMessage(
      from,
      "📝 Address received! Generating your payment link..."
    );

    try {
      // Generate order ID
      const orderId = orderRepository.generateOrderId();

      // Create payment link using tenant's Razorpay account
      const paymentLink = await razorpayService.createPaymentLink({
        amount: conversation.cart.totalInRupees,
        customerPhone: from,
        customerName: conversation.customerName || 'Customer',
        orderId,
        description: `Order ${orderId} - ${conversation.cart.items.length} item(s)`,
      });

      // Create order in database with tenantId
      await orderRepository.createOrder(
        tenantId,
        {
          phoneNumber: from,
          customerName: conversation.customerName,
          items: conversation.cart.items,
          totalAmount: conversation.cart.totalInRupees,
          shippingAddress: {
            fullAddress: addressText,
            country: 'India',
          },
        },
        paymentLink.id,
        paymentLink.shortUrl
      );

      // Update conversation
      await conversationRepository.updateByPhoneNumber(tenantId, from, {
        state: ConversationState.AWAITING_PAYMENT,
        address: addressText,
        orderId,
        paymentLinkId: paymentLink.id,
        paymentLinkUrl: paymentLink.shortUrl,
      });

      // Send payment message
      const paymentMessage = this.buildPaymentMessage(
        orderId,
        conversation.cart.items.length,
        conversation.cart.totalInRupees,
        addressText,
        paymentLink.shortUrl
      );

      await whatsappService.sendTextMessage(from, paymentMessage);

      logger.info({ from, orderId, paymentLinkId: paymentLink.id, tenantId }, '✅ Payment link sent');
    } catch (error) {
      logger.error({ error, from, tenantId }, '❌ Failed to create payment link');

      await whatsappService.sendTextMessage(
        from,
        "Sorry, there was an issue generating your payment link. Please try again or contact us for assistance."
      );
    }
  }

  /**
   * Handle successful payment webhook
   * Note: This is called from Razorpay webhook which doesn't have tenant context in request
   * We resolve tenant from the order's tenantId
   */
  async handlePaymentSuccess(payload: RazorpayWebhookPayload): Promise<void> {
    const paymentLinkEntity = payload.payload.payment_link?.entity;

    if (!paymentLinkEntity) {
      logger.error('Payment webhook missing payment_link entity');
      return;
    }

    const paymentLinkId = paymentLinkEntity.id;
    logger.info({ paymentLinkId }, '💰 Processing payment success');

    // Find order (global lookup - payment link ID is unique)
    const order = await orderRepository.findByPaymentLinkIdGlobal(paymentLinkId);

    if (!order) {
      logger.error({ paymentLinkId }, '❌ Order not found');
      return;
    }

    const tenantId = order.tenantId;

    // Find conversation using tenantId
    const conversation = await conversationRepository.findByPaymentLinkId(tenantId, paymentLinkId);

    if (!conversation) {
      logger.error({ paymentLinkId, tenantId }, '❌ Conversation not found');
      return;
    }

    // Resolve tenant config for sending messages
    const tenantConfig = await tenantResolver.resolveByTenantId(tenantId);
    if (!tenantConfig) {
      logger.error({ tenantId }, '❌ Tenant config not found');
      return;
    }

    // Get tenant-scoped services
    const whatsappService = serviceFactory.getWhatsAppService(tenantConfig);

    // Get payment details
    const payment = paymentLinkEntity.payments?.[0];
    const paymentId = payment?.payment_id || '';
    const paymentMethod = payment?.method || '';

    // Update order status (global lookup is OK here)
    await orderRepository.markAsPaid(order.orderId, paymentId, paymentMethod);

    // Update conversation
    await conversationRepository.updateByPhoneNumber(tenantId, conversation.phoneNumber, {
      state: ConversationState.COMPLETED,
    });

    // Send WhatsApp confirmation
    const confirmationMessage = this.buildConfirmationMessage(
      conversation.customerName || 'valued customer',
      order.orderId,
      order.totalAmount,
      conversation.address || ''
    );

    await whatsappService.sendTextMessage(conversation.phoneNumber, confirmationMessage);

    // Note: SMS notifications would need tenant-scoped SMS service
    // For now, we skip SMS or implement later
    logger.info(
      { orderId: order.orderId, phoneNumber: conversation.phoneNumber, tenantId },
      '✅ Order confirmation sent'
    );
  }

  /**
   * Handle payment link expired webhook
   */
  async handlePaymentExpired(payload: RazorpayWebhookPayload): Promise<void> {
    const paymentLinkEntity = payload.payload.payment_link?.entity;

    if (!paymentLinkEntity) {
      logger.error('Payment expired webhook missing payment_link entity');
      return;
    }

    const paymentLinkId = paymentLinkEntity.id;
    logger.info({ paymentLinkId }, '⏰ Processing payment expiration');

    // Update order (global lookup)
    await orderRepository.markPaymentExpired(paymentLinkId);

    // Find order to get tenantId
    const order = await orderRepository.findByPaymentLinkIdGlobal(paymentLinkId);
    if (!order) {
      logger.warn({ paymentLinkId }, '⚠️ Order not found for expired payment');
      return;
    }

    const tenantId = order.tenantId;

    // Find and update conversation
    const conversation = await conversationRepository.findByPaymentLinkId(tenantId, paymentLinkId);

    if (conversation) {
      // Resolve tenant config for sending messages
      const tenantConfig = await tenantResolver.resolveByTenantId(tenantId);
      if (!tenantConfig) {
        logger.error({ tenantId }, '❌ Tenant config not found');
        return;
      }

      const whatsappService = serviceFactory.getWhatsAppService(tenantConfig);

      await conversationRepository.resetConversation(tenantId, conversation.phoneNumber);

      await whatsappService.sendButtonMessage(
        conversation.phoneNumber,
        `Your payment link has expired. Would you like to place the order again?`,
        [{ id: 'view_catalog', title: '🛍️ Start New Order' }]
      );
    }
  }

  /**
   * Validate address
   */
  private isValidAddress(address: string): boolean {
    // Basic validation - address should have reasonable length
    // and contain some alphanumeric characters
    const trimmed = address.trim();
    return trimmed.length >= 20 && /[a-zA-Z0-9]/.test(trimmed);
  }

  /**
   * Build payment message
   */
  private buildPaymentMessage(
    orderId: string,
    itemCount: number,
    total: number,
    address: string,
    paymentUrl: string
  ): string {
    return (
      `✅ *Order Summary*\n\n` +
      `Order ID: ${orderId}\n` +
      `Items: ${itemCount}\n` +
      `Total: *₹${total}*\n\n` +
      `📍 *Delivery Address:*\n${address}\n\n` +
      `💳 *Click below to pay securely:*\n${paymentUrl}\n\n` +
      `_This link is valid for 24 hours._`
    );
  }

  /**
   * Build confirmation message
   */
  private buildConfirmationMessage(
    customerName: string,
    orderId: string,
    amount: number,
    address: string
  ): string {
    return (
      `🎉 *Payment Received!*\n\n` +
      `Thank you, ${customerName}!\n\n` +
      `✅ *Order Confirmed*\n` +
      `Order ID: ${orderId}\n` +
      `Amount Paid: ₹${amount}\n\n` +
      `📦 Your order will be shipped within 2-3 business days.\n\n` +
      `📍 *Shipping to:*\n${address}\n\n` +
      `We'll send you tracking details once shipped.\n\n` +
      `Thank you for shopping with us! 🙏`
    );
  }
}

// Singleton instance
export const orderHandler = new OrderHandler();
