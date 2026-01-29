import { ConversationModel, type ConversationDocument } from '@/domain/models';
import { ConversationState, type ConversationUpdate } from '@/domain/types';
import { BaseRepository } from './base.repository';

/**
 * Conversation Repository - Multi-tenant aware
 */
export class ConversationRepository extends BaseRepository<ConversationDocument> {
  constructor() {
    super(ConversationModel);
  }

  /**
   * Get or create conversation by phone number for a specific tenant
   */
  async getOrCreate(tenantId: string, phoneNumber: string): Promise<ConversationDocument> {
    let conversation = await this.findByPhoneNumber(tenantId, phoneNumber);

    if (!conversation) {
      conversation = await this.create({
        tenantId,
        phoneNumber,
        state: ConversationState.NEW,
        lastMessageAt: new Date(),
      } as Partial<ConversationDocument>);
    }

    return conversation;
  }

  /**
   * Find conversation by phone number for a specific tenant
   */
  async findByPhoneNumber(tenantId: string, phoneNumber: string): Promise<ConversationDocument | null> {
    return this.findOne({ tenantId, phoneNumber });
  }

  /**
   * Find conversation by payment link ID for a specific tenant
   */
  async findByPaymentLinkId(tenantId: string, paymentLinkId: string): Promise<ConversationDocument | null> {
    return this.findOne({ tenantId, paymentLinkId });
  }

  /**
   * Find conversation by payment link ID (global - for webhook handling)
   */
  async findByPaymentLinkIdGlobal(paymentLinkId: string): Promise<ConversationDocument | null> {
    return this.findOne({ paymentLinkId });
  }

  /**
   * Find conversation by order ID for a specific tenant
   */
  async findByOrderId(tenantId: string, orderId: string): Promise<ConversationDocument | null> {
    return this.findOne({ tenantId, orderId });
  }

  /**
   * Update conversation by phone number for a specific tenant
   */
  async updateByPhoneNumber(
    tenantId: string,
    phoneNumber: string,
    update: ConversationUpdate
  ): Promise<ConversationDocument | null> {
    return this.update(
      { tenantId, phoneNumber },
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
  async resetConversation(tenantId: string, phoneNumber: string): Promise<ConversationDocument | null> {
    return this.updateByPhoneNumber(tenantId, phoneNumber, {
      state: ConversationState.BROWSING,
      cart: undefined,
      address: undefined,
      orderId: undefined,
      paymentLinkId: undefined,
      paymentLinkUrl: undefined,
    });
  }

  /**
   * Find stale conversations for a specific tenant (for cleanup)
   */
  async findStaleConversations(
    tenantId: string,
    olderThan: Date,
    states: ConversationState[]
  ): Promise<ConversationDocument[]> {
    return this.find({
      tenantId,
      lastMessageAt: { $lt: olderThan },
      state: { $in: states },
    });
  }

  /**
   * Get conversation stats for a specific tenant
   */
  async getConversationStats(tenantId: string): Promise<Record<ConversationState, number>> {
    const pipeline = [
      { $match: { tenantId } },
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

  /**
   * Get all conversations for a tenant (paginated)
   */
  async findByTenant(
    tenantId: string,
    options?: { limit?: number; skip?: number; state?: ConversationState }
  ): Promise<ConversationDocument[]> {
    const filter: Record<string, unknown> = { tenantId };
    if (options?.state) {
      filter.state = options.state;
    }
    return this.find(filter, {
      sort: { lastMessageAt: -1 },
      limit: options?.limit || 50,
      skip: options?.skip || 0,
    });
  }
}

// Singleton instance
export const conversationRepository = new ConversationRepository();
