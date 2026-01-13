# WhatsApp Catalog Automation

> A production-ready WhatsApp Business automation system with native catalog support, Razorpay payments, and SMS notifications. Built with Elysia (Bun), TypeScript, and MongoDB.

## 🌟 Features

- **WhatsApp Native Catalog** - Customers browse products directly in WhatsApp
- **Automated Order Flow** - Cart → Address → Payment → Confirmation
- **Razorpay Integration** - Secure payment links with webhook handling
- **SMS Notifications** - Order confirmations via MSG91/Twilio
- **MongoDB Persistence** - Scalable data storage with proper indexing
- **Clean Architecture** - Repository pattern, service layer, dependency injection
- **Type Safety** - Full TypeScript with Zod validation

## 📋 Prerequisites

- [Bun](https://bun.sh/) >= 1.0
- MongoDB >= 6.0
- Meta Business Account with WhatsApp Business API access
- Razorpay Account
- (Optional) MSG91 or Twilio for SMS

## 🚀 Quick Start

### 1. Clone and Install

```bash
cd whatsapp-automation
bun install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Start Development Server

```bash
bun run dev
```

### 4. Expose Local Server (for webhook testing)

```bash
# Using ngrok
ngrok http 3000

# Use the ngrok URL for webhook configuration
```

## 📁 Project Structure

```
src/
├── index.ts                 # Application entry point
├── config/
│   ├── env.ts              # Environment configuration with Zod validation
│   └── database.ts         # MongoDB connection
├── domain/
│   ├── types/              # TypeScript interfaces and types
│   │   ├── conversation.types.ts
│   │   ├── order.types.ts
│   │   ├── whatsapp.types.ts
│   │   └── razorpay.types.ts
│   └── models/             # Mongoose models
│       ├── conversation.model.ts
│       └── order.model.ts
├── repositories/           # Data access layer
│   ├── base.repository.ts
│   ├── conversation.repository.ts
│   └── order.repository.ts
├── services/               # Business logic
│   ├── whatsapp.service.ts
│   ├── razorpay.service.ts
│   └── sms.service.ts
├── handlers/               # Message processing
│   ├── message.handler.ts  # State machine logic
│   └── order.handler.ts    # Order processing
├── routes/                 # API routes
│   ├── whatsapp.routes.ts
│   ├── razorpay.routes.ts
│   ├── health.routes.ts
│   └── admin.routes.ts
└── utils/
    └── logger.ts           # Pino logger
```

## 🔄 Conversation Flow

```
┌─────────┐     ┌──────────┐     ┌─────────────────┐
│   NEW   │ ──▶ │ BROWSING │ ──▶ │ AWAITING_ADDRESS│
└─────────┘     └──────────┘     └────────┬────────┘
                                          │
                                          ▼
                              ┌─────────────────────┐
                              │  AWAITING_PAYMENT   │
                              └──────────┬──────────┘
                                         │
                                         ▼
                                  ┌───────────┐
                                  │ COMPLETED │
                                  └───────────┘
```

## 📡 API Endpoints

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/webhook/whatsapp` | WhatsApp verification |
| POST | `/webhook/whatsapp` | Incoming messages |
| POST | `/webhook/razorpay` | Payment events |

### Health & Monitoring

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Basic health check |
| GET | `/health/detailed` | Detailed with dependencies |
| GET | `/stats` | Conversation & order stats |

### Admin (protect in production!)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/orders` | List all orders |
| GET | `/admin/orders/:id` | Get order by ID |
| PATCH | `/admin/orders/:id/status` | Update order status |
| GET | `/admin/customers/:phone/orders` | Customer orders |
| POST | `/admin/conversations/:phone/reset` | Reset conversation |
| POST | `/admin/send-message` | Send manual message |

## ⚙️ Configuration

### WhatsApp Setup

1. Go to [Meta Developer Dashboard](https://developers.facebook.com)
2. Create or select your app
3. Add WhatsApp product
4. Get Phone Number ID and Access Token from API Setup
5. Configure webhook URL: `https://your-domain.com/webhook/whatsapp`
6. Subscribe to `messages` webhook field

### Product Catalog

1. Go to [Commerce Manager](https://business.facebook.com/commerce)
2. Create a catalog
3. Add products with Retailer IDs
4. Link catalog to WhatsApp Business Account

### Razorpay Setup

1. Get API keys from [Razorpay Dashboard](https://dashboard.razorpay.com/app/keys)
2. Configure webhook: `https://your-domain.com/webhook/razorpay`
3. Select events: `payment_link.paid`, `payment_link.expired`
4. Save webhook secret

## 🚀 Deployment

### Using PM2

```bash
# Build (optional, Bun can run TypeScript directly)
bun run build

# Start with PM2
pm2 start bun --name whatsapp-bot -- run start
```

### Using Docker

```dockerfile
FROM oven/bun:1

WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY . .
EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]
```

### Environment Variables for Production

```bash
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/whatsapp
# ... other production credentials
```

## 🧪 Testing

### Local Testing with ngrok

```bash
# Terminal 1: Start server
bun run dev

# Terminal 2: Expose with ngrok
ngrok http 3000

# Use ngrok URL for webhook configuration
```

### Test Cards (Razorpay)

- Card: `4111 1111 1111 1111`
- Expiry: Any future date
- CVV: Any 3 digits

## 📊 Monitoring

The application logs structured JSON in production and pretty-printed output in development.

```typescript
// Example log output
{
  "level": 30,
  "time": 1705123456789,
  "msg": "✅ Text message sent",
  "to": "919876543210"
}
```

## 🔒 Security Considerations

1. **Webhook Verification** - Always verify Razorpay webhook signatures
2. **Access Tokens** - Rotate WhatsApp tokens periodically
3. **Admin Routes** - Add authentication middleware in production
4. **Environment Variables** - Never commit `.env` file
5. **Rate Limiting** - Consider adding rate limiting for webhooks

## 📚 Resources

- [WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [WhatsApp Commerce Docs](https://developers.facebook.com/docs/whatsapp/commerce)
- [Razorpay Payment Links API](https://razorpay.com/docs/payment-links/)
- [Elysia Documentation](https://elysiajs.com/)
- [Bun Documentation](https://bun.sh/docs)

## 📄 License

MIT

