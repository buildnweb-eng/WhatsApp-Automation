import { config } from '@/config/env';
import { logger } from '@/utils/logger';
import { conversationRepository } from '@/repositories';
import { whatsappService } from '@/services';
import { orderHandler } from './order.handler';
import {
  ConversationState,
  type ProcessedMessageContext,
  type WhatsAppOrderMessage,
  type WhatsAppInteractiveMessage,
} from '@/domain/types';
import type { ConversationDocument } from '@/domain/models';

/**
 * Message Handler - Core state machine logic
 */
export class MessageHandler {
  /**
   * Process incoming message
   */
  async processMessage(context: ProcessedMessageContext): Promise<void> {
    const { from, name, type, message } = context;
    
    logger.info(
      { from, name, type, messageId: message.id },
      '📨 Processing incoming message'
    );

    try {
      // Get or create conversation
      const conversation = await conversationRepository.getOrCreate(from);

      // Update customer name if available
      if (name && !conversation.customerName) {
        await conversationRepository.updateByPhoneNumber(from, { customerName: name });
        conversation.customerName = name;
      }

      // Mark message as read
      await whatsappService.markAsRead(message.id);

      // Route based on message type
      switch (type) {
        case 'text':
          await this.handleTextMessage(from, message.text!.body, conversation);
          break;

        case 'order':
          await this.handleOrderMessage(from, message.order!, conversation);
          break;

        case 'interactive':
          await this.handleInteractiveMessage(from, message.interactive!, conversation);
          break;

        default:
          await this.handleUnsupportedMessage(from, type);
      }
    } catch (error) {
      logger.error({ error, from, type }, '❌ Error processing message');
      await this.sendErrorMessage(from);
    }
  }

  /**
   * Handle text messages
   */
  private async handleTextMessage(
    from: string,
    text: string,
    conversation: ConversationDocument
  ): Promise<void> {
    const normalizedText = text.toLowerCase().trim();
    
    logger.debug(
      { from, text: text.substring(0, 50), state: conversation.state },
      '💬 Handling text message'
    );

    // Global commands (work in any state)
    if (this.isRestartCommand(normalizedText)) {
      await this.handleRestart(from);
      return;
    }

    if (this.isHelpCommand(normalizedText)) {
      await this.sendHelpMessage(from);
      return;
    }

    // State-based handling
    switch (conversation.state) {
      case ConversationState.NEW:
        await this.handleNewCustomer(from);
        break;

      case ConversationState.BROWSING:
        await this.handleBrowsingState(from, text);
        break;

      case ConversationState.AWAITING_ADDRESS:
        await orderHandler.processAddress(from, text, conversation);
        break;

      case ConversationState.AWAITING_PAYMENT:
        await this.handleAwaitingPaymentState(from, conversation);
        break;

      case ConversationState.COMPLETED:
        await this.handleCompletedState(from);
        break;

      default:
        await this.handleNewCustomer(from);
    }
  }

  /**
   * Handle order/cart messages - THE KEY FUNCTION
   */
  private async handleOrderMessage(
    from: string,
    order: WhatsAppOrderMessage,
    conversation: ConversationDocument
  ): Promise<void> {
    logger.info({ from, catalogId: order.catalog_id }, '🛒 Processing order message');

    const items = order.product_items || [];

    if (items.length === 0) {
      await whatsappService.sendTextMessage(
        from,
        'Your cart appears to be empty. Please add some items and try again! 🛒'
      );
      return;
    }

    // Calculate totals and build cart
    let totalInPaise = 0;
    const cartItems = items.map((item) => {
      const itemTotal = item.item_price * item.quantity;
      totalInPaise += itemTotal;
      
      return {
        productId: item.product_retailer_id,
        quantity: item.quantity,
        priceInPaise: item.item_price,
        priceInRupees: item.item_price / 100,
        totalInRupees: itemTotal / 100,
      };
    });

    const totalInRupees = totalInPaise / 100;

    // Update conversation with cart
    await conversationRepository.updateByPhoneNumber(from, {
      state: ConversationState.AWAITING_ADDRESS,
      cart: {
        catalogId: order.catalog_id,
        items: cartItems,
        totalInPaise,
        totalInRupees,
      },
    });

    // Build and send cart summary
    const cartSummary = this.buildCartSummary(cartItems, totalInRupees);
    await whatsappService.sendTextMessage(from, cartSummary);
  }

  /**
   * Handle interactive messages (button clicks, list selections)
   */
  private async handleInteractiveMessage(
    from: string,
    interactive: WhatsAppInteractiveMessage,
    conversation: ConversationDocument
  ): Promise<void> {
    if (interactive.button_reply) {
      const buttonId = interactive.button_reply.id;
      logger.debug({ from, buttonId }, '🔘 Button clicked');

      switch (buttonId) {
        case 'view_catalog':
          await whatsappService.sendCatalogMessage(from);
          await conversationRepository.updateByPhoneNumber(from, {
            state: ConversationState.BROWSING,
          });
          break;

        case 'restart':
          await this.handleRestart(from);
          break;

        case 'help':
          await this.sendHelpMessage(from);
          break;

        default:
          logger.warn({ buttonId }, '⚠️ Unknown button clicked');
      }
    }

    if (interactive.list_reply) {
      const listId = interactive.list_reply.id;
      logger.debug({ from, listId }, '📋 List item selected');
      // Handle list selections if needed
    }
  }

  /**
   * Handle new customer - send greeting
   */
  private async handleNewCustomer(from: string): Promise<void> {
    const greeting = this.buildGreetingMessage();
    
    await whatsappService.sendButtonMessage(from, greeting, [
      { id: 'view_catalog', title: '🛍️ View Collection' },
    ]);

    await conversationRepository.updateByPhoneNumber(from, {
      state: ConversationState.BROWSING,
    });
  }

  /**
   * Handle browsing state
   */
  private async handleBrowsingState(from: string, text: string): Promise<void> {
    // Check if customer wants to see catalog
    if (this.isCatalogRequest(text.toLowerCase())) {
      await whatsappService.sendCatalogMessage(from);
      return;
    }

    // Send reminder to use catalog
    await whatsappService.sendTextMessage(
      from,
      "Please browse our collection and add items to your cart! 🛒\n\n" +
      "Once you've selected your items, send your cart and I'll help you complete your order.\n\n" +
      "_Type 'catalog' to view our collection_"
    );
  }

  /**
   * Handle awaiting payment state
   */
  private async handleAwaitingPaymentState(
    from: string,
    conversation: ConversationDocument
  ): Promise<void> {
    const message =
      `Please complete your payment using the link I sent earlier.\n\n` +
      `💳 Payment Link: ${conversation.paymentLinkUrl || 'Check previous message'}\n\n` +
      `_Type 'restart' to start a new order or 'help' for assistance._`;

    await whatsappService.sendTextMessage(from, message);
  }

  /**
   * Handle completed state
   */
  private async handleCompletedState(from: string): Promise<void> {
    await whatsappService.sendButtonMessage(
      from,
      `Thank you for your order! 🙏\n\n` +
      `Would you like to place another order?`,
      [{ id: 'view_catalog', title: '🛍️ Shop Again' }]
    );
  }

  /**
   * Handle restart command
   */
  private async handleRestart(from: string): Promise<void> {
    await conversationRepository.resetConversation(from);
    await this.handleNewCustomer(from);
    logger.info({ from }, '🔄 Conversation restarted');
  }

  /**
   * Handle unsupported message types
   */
  private async handleUnsupportedMessage(from: string, type: string): Promise<void> {
    logger.warn({ from, type }, '⚠️ Unsupported message type');
    
    await whatsappService.sendTextMessage(
      from,
      "Sorry, I can only process text messages and orders from our catalog. 🙏\n\n" +
      "Please send your order from the catalog or type your message."
    );
  }

  /**
   * Send error message
   */
  private async sendErrorMessage(from: string): Promise<void> {
    try {
      await whatsappService.sendTextMessage(
        from,
        "Sorry, something went wrong. Please try again or type 'restart' to start fresh. 🙏"
      );
    } catch {
      logger.error({ from }, '❌ Failed to send error message');
    }
  }

  /**
   * Send help message
   */
  private async sendHelpMessage(from: string): Promise<void> {
    const helpMessage =
      `*How to Order:* 📦\n\n` +
      `1️⃣ Browse our collection\n` +
      `2️⃣ Add items to your cart\n` +
      `3️⃣ Send your cart when ready\n` +
      `4️⃣ Share your delivery address\n` +
      `5️⃣ Complete payment\n\n` +
      `*Commands:*\n` +
      `• _catalog_ - View our collection\n` +
      `• _restart_ - Start a new order\n` +
      `• _help_ - Show this message\n\n` +
      `Need human assistance? Call us at ${config.business.phone}`;

    await whatsappService.sendTextMessage(from, helpMessage);
  }

  /**
   * Build greeting message
   */
  private buildGreetingMessage(): string {
    return (
      `🙏 *Welcome to ${config.business.name}!*\n\n` +
      `We have a beautiful collection of handpicked items waiting for you.\n\n` +
      `Click the button below to browse our collection. Add items you like to your cart, ` +
      `and send the cart when you're ready to order!`
    );
  }

  /**
   * Build cart summary message
   */
  private buildCartSummary(
    items: Array<{ productId: string; quantity: number; priceInRupees: number; totalInRupees: number }>,
    total: number
  ): string {
    let summary = "✨ *Great choices!* Here's your order:\n\n";
    
    items.forEach((item, index) => {
      summary += `${index + 1}. ${item.productId}\n`;
      summary += `   Qty: ${item.quantity} × ₹${item.priceInRupees} = ₹${item.totalInRupees}\n`;
    });
    
    summary += `\n*Total: ₹${total}*\n\n`;
    summary += `📍 To calculate shipping and generate your bill, please reply with your *complete delivery address* including:\n`;
    summary += `• House/Flat number\n`;
    summary += `• Street name\n`;
    summary += `• City, State\n`;
    summary += `• PIN code`;
    
    return summary;
  }

  /**
   * Check if text is a restart command
   */
  private isRestartCommand(text: string): boolean {
    const commands = ['restart', 'reset', 'start over', 'cancel', 'new order'];
    return commands.some((cmd) => text.includes(cmd));
  }

  /**
   * Check if text is a help command
   */
  private isHelpCommand(text: string): boolean {
    const commands = ['help', 'support', 'assistance', '?'];
    return commands.some((cmd) => text.includes(cmd));
  }

  /**
   * Check if text is a catalog request
   */
  private isCatalogRequest(text: string): boolean {
    const keywords = ['catalog', 'catalogue', 'collection', 'products', 'items', 'browse', 'shop'];
    return keywords.some((kw) => text.includes(kw));
  }
}

// Singleton instance
export const messageHandler = new MessageHandler();

