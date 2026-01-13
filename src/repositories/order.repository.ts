import { OrderModel, type OrderDocument } from '@/domain/models';
import { OrderStatus, PaymentStatus, type CreateOrderDto, type UpdateOrderDto } from '@/domain/types';
import { BaseRepository } from './base.repository';
import { nanoid } from 'nanoid';

/**
 * Order Repository
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
   * Create a new order
   */
  async createOrder(dto: CreateOrderDto, paymentLinkId: string, paymentLinkUrl: string): Promise<OrderDocument> {
    const orderId = this.generateOrderId();
    
    return this.create({
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
   * Find order by order ID
   */
  async findByOrderId(orderId: string): Promise<OrderDocument | null> {
    return this.findOne({ orderId });
  }

  /**
   * Find order by payment link ID
   */
  async findByPaymentLinkId(paymentLinkId: string): Promise<OrderDocument | null> {
    return this.findOne({ 'payment.paymentLinkId': paymentLinkId });
  }

  /**
   * Find orders by phone number
   */
  async findByPhoneNumber(
    phoneNumber: string,
    limit = 10
  ): Promise<OrderDocument[]> {
    return this.find(
      { phoneNumber },
      { sort: { createdAt: -1 }, limit }
    );
  }

  /**
   * Update order status
   */
  async updateStatus(
    orderId: string,
    status: OrderStatus
  ): Promise<OrderDocument | null> {
    return this.update(
      { orderId },
      { status, updatedAt: new Date() }
    );
  }

  /**
   * Mark order as paid
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
   * Mark payment as expired
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
   * Get orders by status
   */
  async findByStatus(
    status: OrderStatus,
    limit = 50
  ): Promise<OrderDocument[]> {
    return this.find(
      { status },
      { sort: { createdAt: -1 }, limit }
    );
  }

  /**
   * Get order statistics
   */
  async getOrderStats(startDate?: Date, endDate?: Date): Promise<{
    totalOrders: number;
    totalRevenue: number;
    byStatus: Record<OrderStatus, number>;
  }> {
    const dateFilter: Record<string, unknown> = {};
    if (startDate) dateFilter.$gte = startDate;
    if (endDate) dateFilter.$lte = endDate;

    const matchStage = Object.keys(dateFilter).length > 0
      ? { createdAt: dateFilter }
      : {};

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

