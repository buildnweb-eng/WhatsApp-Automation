import mongoose, { Schema, Document } from 'mongoose';
import { OrderStatus, PaymentStatus, type PaymentDetails, type ShippingAddress, type OrderItem } from '../types/order.types';

export interface OrderDocument extends Document {
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

const OrderItemSchema = new Schema({
  productId: { type: String, required: true },
  productName: { type: String },
  quantity: { type: Number, required: true },
  priceInPaise: { type: Number, required: true },
  priceInRupees: { type: Number, required: true },
  totalInRupees: { type: Number, required: true },
}, { _id: false });

const ShippingAddressSchema = new Schema({
  fullAddress: { type: String, required: true },
  city: { type: String },
  state: { type: String },
  pincode: { type: String },
  country: { type: String, default: 'India' },
}, { _id: false });

const PaymentDetailsSchema = new Schema({
  paymentLinkId: { type: String, required: true },
  paymentLinkUrl: { type: String, required: true },
  paymentId: { type: String },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  status: {
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING,
  },
  paidAt: { type: Date },
  method: { type: String },
}, { _id: false });

const OrderSchema = new Schema<OrderDocument>(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      index: true,
    },
    customerName: {
      type: String,
    },
    items: {
      type: [OrderItemSchema],
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    shippingAddress: {
      type: ShippingAddressSchema,
      required: true,
    },
    payment: {
      type: PaymentDetailsSchema,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PENDING,
    },
    notes: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound indexes for common queries
OrderSchema.index({ phoneNumber: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ 'payment.paymentLinkId': 1 });

export const OrderModel = mongoose.model<OrderDocument>('Order', OrderSchema);

