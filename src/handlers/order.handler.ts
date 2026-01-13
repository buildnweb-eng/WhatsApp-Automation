import { logger } from '@/utils/logger';
import { conversationRepository, orderRepository } from '@/repositories';
import { whatsappService, razorpayService, smsService } from '@/services';
import { ConversationState, PaymentStatus, OrderStatus } from '@/domain/types';
import type { ConversationDocument } from '@/domain/models';
import type { RazorpayWebhookPayload } from '@/domain/types';

/**
 * Order Handler - Manages order processing, payments, and confirmations
 */
export class OrderHandler {
  /**
   * Process customer address and generate payment link
   */
  async processAddress(
    from: string,
    addressText: string,
    conversation: ConversationDocument
  ): Promise<void> {
    logger.info({ from, addressLength: addressText.length }, '📍 Processing address');

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
      await conversationRepository.updateByPhoneNumber(from, {
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

      // Create payment link
      const paymentLink = await razorpayService.createPaymentLink({
        amount: conversation.cart.totalInRupees,
        customerPhone: from,
        customerName: conversation.customerName || 'Customer',
        orderId,
        description: `Order ${orderId} - ${conversation.cart.items.length} item(s)`,
      });

      // Create order in database
      await orderRepository.createOrder(
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
      await conversationRepository.updateByPhoneNumber(from, {
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

      logger.info({ from, orderId, paymentLinkId: paymentLink.id }, '✅ Payment link sent');
    } catch (error) {
      logger.error({ error, from }, '❌ Failed to create payment link');
      
      await whatsappService.sendTextMessage(
        from,
        "Sorry, there was an issue generating your payment link. Please try again or contact us for assistance."
      );
    }
  }

  /**
   * Handle successful payment webhook
   */
  async handlePaymentSuccess(payload: RazorpayWebhookPayload): Promise<void> {
    const paymentLinkEntity = payload.payload.payment_link?.entity;
    
    if (!paymentLinkEntity) {
      logger.error('Payment webhook missing payment_link entity');
      return;
    }

    const paymentLinkId = paymentLinkEntity.id;
    logger.info({ paymentLinkId }, '💰 Processing payment success');

    // Find order and conversation
    const order = await orderRepository.findByPaymentLinkId(paymentLinkId);
    const conversation = await conversationRepository.findByPaymentLinkId(paymentLinkId);

    if (!order || !conversation) {
      logger.error({ paymentLinkId }, '❌ Order or conversation not found');
      return;
    }

    // Get payment details
    const payment = paymentLinkEntity.payments?.[0];
    const paymentId = payment?.payment_id || '';
    const paymentMethod = payment?.method || '';

    // Update order status
    await orderRepository.markAsPaid(order.orderId, paymentId, paymentMethod);

    // Update conversation
    await conversationRepository.updateByPhoneNumber(conversation.phoneNumber, {
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

    // Send SMS notifications
    await Promise.all([
      smsService.sendOrderConfirmation(
        conversation.phoneNumber,
        order.orderId,
        order.totalAmount
      ),
      smsService.sendBusinessNotification(
        conversation.customerName || conversation.phoneNumber,
        order.orderId,
        order.totalAmount,
        order.items.length
      ),
    ]);

    logger.info(
      { orderId: order.orderId, phoneNumber: conversation.phoneNumber },
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

    // Update order
    await orderRepository.markPaymentExpired(paymentLinkId);

    // Find and update conversation
    const conversation = await conversationRepository.findByPaymentLinkId(paymentLinkId);
    
    if (conversation) {
      await conversationRepository.resetConversation(conversation.phoneNumber);

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

