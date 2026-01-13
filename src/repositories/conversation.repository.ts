import { ConversationModel, type ConversationDocument } from '@/domain/models';
import { ConversationState, type ConversationUpdate } from '@/domain/types';
import { BaseRepository } from './base.repository';

/**
 * Conversation Repository
 */
export class ConversationRepository extends BaseRepository<ConversationDocument> {
  constructor() {
    super(ConversationModel);
  }

  /**
   * Get or create conversation by phone number
   */
  async getOrCreate(phoneNumber: string): Promise<ConversationDocument> {
    let conversation = await this.findByPhoneNumber(phoneNumber);
    
    if (!conversation) {
      conversation = await this.create({
        phoneNumber,
        state: ConversationState.NEW,
        lastMessageAt: new Date(),
      } as Partial<ConversationDocument>);
    }
    
    return conversation;
  }

  /**
   * Find conversation by phone number
   */
  async findByPhoneNumber(phoneNumber: string): Promise<ConversationDocument | null> {
    return this.findOne({ phoneNumber });
  }

  /**
   * Find conversation by payment link ID
   */
  async findByPaymentLinkId(paymentLinkId: string): Promise<ConversationDocument | null> {
    return this.findOne({ paymentLinkId });
  }

  /**
   * Find conversation by order ID
   */
  async findByOrderId(orderId: string): Promise<ConversationDocument | null> {
    return this.findOne({ orderId });
  }

  /**
   * Update conversation by phone number
   */
  async updateByPhoneNumber(
    phoneNumber: string,
    update: ConversationUpdate
  ): Promise<ConversationDocument | null> {
    return this.update(
      { phoneNumber },
      { 
        ...update, 
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      }
    );
  }

  /**
   * Reset conversation to browsing state
   */
  async resetConversation(phoneNumber: string): Promise<ConversationDocument | null> {
    return this.updateByPhoneNumber(phoneNumber, {
      state: ConversationState.BROWSING,
      cart: undefined,
      address: undefined,
      orderId: undefined,
      paymentLinkId: undefined,
      paymentLinkUrl: undefined,
    });
  }

  /**
   * Find stale conversations (for cleanup)
   */
  async findStaleConversations(
    olderThan: Date,
    states: ConversationState[]
  ): Promise<ConversationDocument[]> {
    return this.find({
      lastMessageAt: { $lt: olderThan },
      state: { $in: states },
    });
  }

  /**
   * Get active conversations count by state
   */
  async getConversationStats(): Promise<Record<ConversationState, number>> {
    const pipeline = [
      {
        $group: {
          _id: '$state',
          count: { $sum: 1 },
        },
      },
    ];

    const results = await ConversationModel.aggregate(pipeline);
    
    const stats = Object.values(ConversationState).reduce((acc, state) => {
      acc[state] = 0;
      return acc;
    }, {} as Record<ConversationState, number>);

    results.forEach(({ _id, count }) => {
      if (_id in stats) {
        stats[_id as ConversationState] = count;
      }
    });

    return stats;
  }
}

// Singleton instance
export const conversationRepository = new ConversationRepository();

