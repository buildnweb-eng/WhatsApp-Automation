import mongoose, { Schema, Document } from 'mongoose';
import { ConversationState, type Cart } from '../types/conversation.types';

export interface ConversationDocument extends Document {
  phoneNumber: string;
  customerName?: string;
  state: ConversationState;
  cart?: Cart;
  address?: string;
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

const ConversationSchema = new Schema<ConversationDocument>(
  {
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
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

// Index for finding stale conversations
ConversationSchema.index({ lastMessageAt: 1, state: 1 });

export const ConversationModel = mongoose.model<ConversationDocument>(
  'Conversation',
  ConversationSchema
);

