import { OrderModel, type OrderDocument } from '@/domain/models';
import { OrderStatus, PaymentStatus, type CreateOrderDto, type UpdateOrderDto } from '@/domain/types';
import { BaseRepository } from './base.repository';
import { nanoid } from 'nanoid';

/**
 * Order Repository - Multi-tenant aware
 */
export class OrderRepository extends BaseRepository<OrderDocument> {
  constructor() {
    super(OrderModel);
  }

  /**
   * Generate unique order ID
   */
  generateOrderId(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = nanoid(4).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }

  /**
   * Create a new order for a specific tenant
   */
  async createOrder(
    tenantId: string,
    dto: CreateOrderDto,
    paymentLinkId: string,
    paymentLinkUrl: string
  ): Promise<OrderDocument> {
    const orderId = this.generateOrderId();

    return this.create({
      tenantId,
      orderId,
      phoneNumber: dto.phoneNumber,
      customerName: dto.customerName,
      items: dto.items,
      totalAmount: dto.totalAmount,
      currency: 'INR',
      shippingAddress: dto.shippingAddress,
      payment: {
        paymentLinkId,
        paymentLinkUrl,
        amount: dto.totalAmount,
        currency: 'INR',
        status: PaymentStatus.CREATED,
      },
      status: OrderStatus.PAYMENT_PENDING,
    } as Partial<OrderDocument>);
  }

  /**
   * Find order by order ID for a specific tenant
   */
  async findByOrderId(tenantId: string, orderId: string): Promise<OrderDocument | null> {
    return this.findOne({ tenantId, orderId });
  }

  /**
   * Find order by payment link ID for a specific tenant
   */
  async findByPaymentLinkId(tenantId: string, paymentLinkId: string): Promise<OrderDocument | null> {
    return this.findOne({ tenantId, 'payment.paymentLinkId': paymentLinkId });
  }

  /**
   * Find order by payment link ID (global - for webhook handling)
   */
  async findByPaymentLinkIdGlobal(paymentLinkId: string): Promise<OrderDocument | null> {
    return this.findOne({ 'payment.paymentLinkId': paymentLinkId });
  }

  /**
   * Find orders by phone number for a specific tenant
   */
  async findByPhoneNumber(
    tenantId: string,
    phoneNumber: string,
    limit = 10
  ): Promise<OrderDocument[]> {
    return this.find(
      { tenantId, phoneNumber },
      { sort: { createdAt: -1 }, limit }
    );
  }

  /**
   * Update order status for a specific tenant
   */
  async updateStatus(
    tenantId: string,
    orderId: string,
    status: OrderStatus
  ): Promise<OrderDocument | null> {
    return this.update(
      { tenantId, orderId },
      { status, updatedAt: new Date() }
    );
  }

  /**
   * Mark order as paid (uses global lookup since webhook may not have tenant context)
   */
  async markAsPaid(
    orderId: string,
    paymentId: string,
    method?: string
  ): Promise<OrderDocument | null> {
    return this.update(
      { orderId },
      {
        status: OrderStatus.PAID,
        'payment.status': PaymentStatus.PAID,
        'payment.paymentId': paymentId,
        'payment.paidAt': new Date(),
        'payment.method': method,
        updatedAt: new Date(),
      }
    );
  }

  /**
   * Mark payment as expired (uses global lookup since webhook may not have tenant context)
   */
  async markPaymentExpired(paymentLinkId: string): Promise<OrderDocument | null> {
    return this.update(
      { 'payment.paymentLinkId': paymentLinkId },
      {
        'payment.status': PaymentStatus.EXPIRED,
        status: OrderStatus.CANCELLED,
        updatedAt: new Date(),
      }
    );
  }

  /**
   * Get orders by status for a specific tenant
   */
  async findByStatus(
    tenantId: string,
    status: OrderStatus,
    limit = 50
  ): Promise<OrderDocument[]> {
    return this.find(
      { tenantId, status },
      { sort: { createdAt: -1 }, limit }
    );
  }

  /**
   * Get all orders for a tenant (paginated)
   */
  async findByTenant(
    tenantId: string,
    options?: { limit?: number; skip?: number; status?: OrderStatus }
  ): Promise<OrderDocument[]> {
    const filter: Record<string, unknown> = { tenantId };
    if (options?.status) {
      filter.status = options.status;
    }
    return this.find(filter, {
      sort: { createdAt: -1 },
      limit: options?.limit || 50,
      skip: options?.skip || 0,
    });
  }

  /**
   * Get order statistics for a specific tenant
   */
  async getOrderStats(
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalOrders: number;
    totalRevenue: number;
    byStatus: Record<OrderStatus, number>;
  }> {
    const matchStage: Record<string, unknown> = { tenantId };

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) (matchStage.createdAt as Record<string, Date>).$gte = startDate;
      if (endDate) (matchStage.createdAt as Record<string, Date>).$lte = endDate;
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [
                { $eq: ['$payment.status', PaymentStatus.PAID] },
                '$totalAmount',
                0,
              ],
            },
          },
        },
      },
    ];

    const results = await OrderModel.aggregate(pipeline);

    const byStatus = Object.values(OrderStatus).reduce((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as Record<OrderStatus, number>);

    let totalOrders = 0;
    let totalRevenue = 0;

    results.forEach(({ _id, count, revenue }) => {
      if (_id in byStatus) {
        byStatus[_id as OrderStatus] = count;
      }
      totalOrders += count;
      totalRevenue += revenue;
    });

    return { totalOrders, totalRevenue, byStatus };
  }
}

// Singleton instance
export const orderRepository = new OrderRepository();
