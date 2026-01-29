import mongoose, { Document, Schema } from 'mongoose';

export interface TenantDocument extends Document {
  tenantId: string;

  // Business Information
  businessName: string;
  businessPhone: string;
  businessEmail: string;

  // WhatsApp Cloud API Configuration (credentials encrypted)
  whatsapp: {
    phoneNumberId: string;
    businessAccountId: string;
    accessToken: string;         // Encrypted
    verifyToken: string;
    catalogId: string;
    apiVersion: string;
  };

  // Razorpay Configuration (credentials encrypted)
  razorpay: {
    keyId: string;               // Encrypted
    keySecret: string;           // Encrypted
    webhookSecret: string;       // Encrypted
  };

  // Optional SMS Configuration
  sms?: {
    provider: 'msg91' | 'twilio' | 'none';
    msg91?: {
      apiKey: string;            // Encrypted
      senderId: string;
      flowId: string;
    };
    twilio?: {
      accountSid: string;        // Encrypted
      authToken: string;         // Encrypted
      phoneNumber: string;
    };
  };

  // Tenant Settings
  settings: {
    welcomeMessage?: string;
    currency: string;
    timezone?: string;
  };

  // Status
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema = new Schema<TenantDocument>(
  {
    tenantId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    businessName: {
      type: String,
      required: true,
    },
    businessPhone: {
      type: String,
      required: true,
    },
    businessEmail: {
      type: String,
      required: true,
    },
    whatsapp: {
      phoneNumberId: {
        type: String,
        required: true,
      },
      businessAccountId: {
        type: String,
        required: true,
      },
      accessToken: {
        type: String,
        required: true,
      },
      verifyToken: {
        type: String,
        required: true,
      },
      catalogId: {
        type: String,
        required: true,
      },
      apiVersion: {
        type: String,
        default: 'v18.0',
      },
    },
    razorpay: {
      keyId: {
        type: String,
        required: true,
      },
      keySecret: {
        type: String,
        required: true,
      },
      webhookSecret: {
        type: String,
        required: true,
      },
    },
    sms: {
      provider: {
        type: String,
        enum: ['msg91', 'twilio', 'none'],
        default: 'none',
      },
      msg91: {
        apiKey: String,
        senderId: String,
        flowId: String,
      },
      twilio: {
        accountSid: String,
        authToken: String,
        phoneNumber: String,
      },
    },
    settings: {
      welcomeMessage: String,
      currency: {
        type: String,
        default: 'INR',
      },
      timezone: {
        type: String,
        default: 'Asia/Kolkata',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient lookups
TenantSchema.index({ 'whatsapp.phoneNumberId': 1 }, { unique: true });
TenantSchema.index({ isActive: 1 });
TenantSchema.index({ businessEmail: 1 });

export const TenantModel = mongoose.model<TenantDocument>('Tenant', TenantSchema);
