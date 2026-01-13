/**
 * Order Status
 */
export enum OrderStatus {
  PENDING = 'PENDING',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  PAID = 'PAID',
  CONFIRMED = 'CONFIRMED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

/**
 * Payment Status
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  CREATED = 'CREATED',
  PAID = 'PAID',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
  REFUNDED = 'REFUNDED',
}

/**
 * Order Item
 */
export interface OrderItem {
  productId: string;
  productName?: string;
  quantity: number;
  priceInPaise: number;
  priceInRupees: number;
  totalInRupees: number;
}

/**
 * Payment Details
 */
export interface PaymentDetails {
  paymentLinkId: string;
  paymentLinkUrl: string;
  paymentId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paidAt?: Date;
  method?: string;
}

/**
 * Shipping Address
 */
export interface ShippingAddress {
  fullAddress: string;
  city?: string;
  state?: string;
  pincode?: string;
  country: string;
}

/**
 * Order Entity
 */
export interface Order {
  _id?: string;
  orderId: string;
  phoneNumber: string;
  customerName?: string;
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  shippingAddress: ShippingAddress;
  payment: PaymentDetails;
  status: OrderStatus;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create Order DTO
 */
export interface CreateOrderDto {
  phoneNumber: string;
  customerName?: string;
  items: OrderItem[];
  totalAmount: number;
  shippingAddress: ShippingAddress;
}

/**
 * Update Order DTO
 */
export interface UpdateOrderDto {
  status?: OrderStatus;
  payment?: Partial<PaymentDetails>;
  notes?: string;
  metadata?: Record<string, unknown>;
}

