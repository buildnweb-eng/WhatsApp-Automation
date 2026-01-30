/**
 * PDF Receipt Generation Types
 */

export interface ReceiptData {
  businessName: string;
  businessPhone: string;
  orderId: string;
  orderDate: Date;
  customerName: string;
  customerPhone: string;
  items: Array<{
    productName: string;
    quantity: number;
    priceInRupees: number;
    totalInRupees: number;
  }>;
  totalAmount: number;
  paymentMethod: string;
  paymentId: string;
  paidAt: Date;
  shippingAddress: {
    fullAddress: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  currency: string;
}

export interface GeneratedPdf {
  buffer: Uint8Array;
  filename: string;
  filePath: string;
}
