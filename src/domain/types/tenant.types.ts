export interface WhatsAppConfig {
  phoneNumberId: string;
  businessAccountId: string;
  accessToken: string;
  verifyToken: string;
  catalogId: string;
  apiVersion: string;
  apiUrl: string;
}

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
}

export interface SMSConfig {
  provider: 'msg91' | 'twilio' | 'none';
  msg91?: {
    apiKey: string;
    senderId: string;
    flowId: string;
  };
  twilio?: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
  };
}

export interface TenantSettings {
  welcomeMessage?: string;
  currency: string;
  timezone?: string;
}

/**
 * Runtime tenant configuration with decrypted credentials
 * Used by services after tenant resolution
 */
export interface TenantConfig {
  tenantId: string;
  businessName: string;
  businessPhone: string;
  businessEmail: string;
  whatsapp: WhatsAppConfig;
  razorpay: RazorpayConfig;
  sms?: SMSConfig;
  settings: TenantSettings;
}

/**
 * Input for creating a new tenant
 */
export interface CreateTenantInput {
  businessName: string;
  businessPhone: string;
  businessEmail: string;
  whatsapp: {
    phoneNumberId: string;
    businessAccountId: string;
    accessToken: string;
    verifyToken: string;
    catalogId: string;
    apiVersion?: string;
  };
  razorpay: {
    keyId: string;
    keySecret: string;
    webhookSecret: string;
  };
  sms?: SMSConfig;
  settings?: Partial<TenantSettings>;
}

/**
 * Input for updating tenant configuration
 */
export interface UpdateTenantInput {
  businessName?: string;
  businessPhone?: string;
  businessEmail?: string;
  whatsapp?: Partial<CreateTenantInput['whatsapp']>;
  razorpay?: Partial<CreateTenantInput['razorpay']>;
  sms?: SMSConfig;
  settings?: Partial<TenantSettings>;
  isActive?: boolean;
}
