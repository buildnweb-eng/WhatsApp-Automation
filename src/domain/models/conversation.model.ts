import mongoose, { Schema, Document } from 'mongoose';
import { ConversationState, type Cart } from '../types/conversation.types';
import type { PendingAddress } from '../types/location.types';

export interface ConversationDocument extends Document {
  tenantId: string;
  phoneNumber: string;
  customerName?: string;
  state: ConversationState;
  cart?: Cart;
  address?: string;
  pendingAddress?: PendingAddress;
  orderId?: string;
  paymentLinkId?: string;
  paymentLinkUrl?: string;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CartItemSchema = new Schema({
  productId: { type: String, required: true },
  productName: { type: String },
  quantity: { type: Number, required: true },
  priceInPaise: { type: Number, required: true },
  priceInRupees: { type: Number, required: true },
  totalInRupees: { type: Number, required: true },
}, { _id: false });

const CartSchema = new Schema({
  catalogId: { type: String, required: true },
  items: [CartItemSchema],
  totalInPaise: { type: Number, required: true },
  totalInRupees: { type: Number, required: true },
}, { _id: false });

const PendingAddressSchema = new Schema({
  text: { type: String, required: true },
  source: { type: String, enum: ['location', 'text'], required: true },
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
  },
}, { _id: false });

const ConversationSchema = new Schema<ConversationDocument>(
  {
    tenantId: {
      type: String,
      required: true,
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
    state: {
      type: String,
      enum: Object.values(ConversationState),
      default: ConversationState.NEW,
    },
    cart: {
      type: CartSchema,
    },
    address: {
      type: String,
    },
    pendingAddress: {
      type: PendingAddressSchema,
    },
    orderId: {
      type: String,
      index: true,
    },
    paymentLinkId: {
      type: String,
      index: true,
    },
    paymentLinkUrl: {
      type: String,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound indexes for multi-tenant queries
ConversationSchema.index({ tenantId: 1, phoneNumber: 1 }, { unique: true });
ConversationSchema.index({ tenantId: 1, lastMessageAt: 1, state: 1 });
ConversationSchema.index({ tenantId: 1, paymentLinkId: 1 });
ConversationSchema.index({ tenantId: 1, orderId: 1 });

export const ConversationModel = mongoose.model<ConversationDocument>(
  'Conversation',
  ConversationSchema
);

