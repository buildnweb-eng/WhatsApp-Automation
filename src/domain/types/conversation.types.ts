import type { PendingAddress } from './location.types';

/**
 * Conversation State Machine States
 */
export enum ConversationState {
  NEW = 'NEW',
  BROWSING = 'BROWSING',
  AWAITING_ADDRESS = 'AWAITING_ADDRESS',
  AWAITING_PAYMENT = 'AWAITING_PAYMENT',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/**
 * Cart Item
 */
export interface CartItem {
  productId: string;
  productName?: string;
  quantity: number;
  priceInPaise: number;
  priceInRupees: number;
  totalInRupees: number;
}

/**
 * Cart
 */
export interface Cart {
  catalogId: string;
  items: CartItem[];
  totalInPaise: number;
  totalInRupees: number;
}

/**
 * Conversation Entity
 */
export interface Conversation {
  _id?: string;
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

/**
 * Conversation Update DTO
 */
export interface ConversationUpdate {
  customerName?: string;
  state?: ConversationState;
  cart?: Cart;
  address?: string;
  pendingAddress?: PendingAddress | null;
  orderId?: string;
  paymentLinkId?: string;
  paymentLinkUrl?: string;
  lastMessageAt?: Date;
}

