import { z } from 'zod';

const envSchema = z.object({
  // Server
  PORT: z.string().default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // MongoDB
  MONGODB_URI: z.string().url(),

  // Multi-tenant encryption key (64 hex chars = 32 bytes)
  // Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  TENANT_ENCRYPTION_KEY: z.string().length(64).optional(),

  // WhatsApp Cloud API (optional in multi-tenant mode - used as default/fallback)
  WHATSAPP_API_VERSION: z.string().default('v18.0'),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional().default(''),
  WHATSAPP_ACCESS_TOKEN: z.string().optional().default(''),
  WHATSAPP_VERIFY_TOKEN: z.string().default('verify_token_2024'),
  WHATSAPP_CATALOG_ID: z.string().optional().default(''),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().optional(),

  // Razorpay (optional in multi-tenant mode - used as default/fallback)
  RAZORPAY_KEY_ID: z.string().optional().default(''),
  RAZORPAY_KEY_SECRET: z.string().optional().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(''),
  
  // SMS (MSG91)
  SMS_API_KEY: z.string().optional(),
  SMS_SENDER_ID: z.string().optional(),
  SMS_FLOW_ID: z.string().optional(),
  
  // Twilio (Alternative SMS)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  
  // Business
  BUSINESS_NAME: z.string().default('Your Store'),
  BUSINESS_PHONE: z.string(),
  
  // App
  APP_URL: z.string().url(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.format());
    process.exit(1);
  }
  
  return result.data;
}

export const env = loadEnv();

export const config = {
  server: {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    isDev: env.NODE_ENV === 'development',
    isProd: env.NODE_ENV === 'production',
  },
  
  mongodb: {
    uri: env.MONGODB_URI,
  },
  
  whatsapp: {
    apiUrl: `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}`,
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: env.WHATSAPP_ACCESS_TOKEN,
    verifyToken: env.WHATSAPP_VERIFY_TOKEN,
    catalogId: env.WHATSAPP_CATALOG_ID,
    businessAccountId: env.WHATSAPP_BUSINESS_ACCOUNT_ID,
  },
  
  razorpay: {
    keyId: env.RAZORPAY_KEY_ID,
    keySecret: env.RAZORPAY_KEY_SECRET,
    webhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
  },
  
  sms: {
    msg91: {
      apiKey: env.SMS_API_KEY,
      senderId: env.SMS_SENDER_ID,
      flowId: env.SMS_FLOW_ID,
    },
    twilio: {
      accountSid: env.TWILIO_ACCOUNT_SID,
      authToken: env.TWILIO_AUTH_TOKEN,
      phoneNumber: env.TWILIO_PHONE_NUMBER,
    },
  },
  
  business: {
    name: env.BUSINESS_NAME,
    phone: env.BUSINESS_PHONE,
  },
  
  app: {
    url: env.APP_URL,
  },
} as const;

