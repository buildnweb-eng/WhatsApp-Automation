# 🛍️ WhatsApp Native Catalog Automation

> A complete e-commerce automation system that allows customers to browse products, add items to cart, and make payments **entirely within WhatsApp** — no external websites needed!

Built with **Elysia (Bun)**, **TypeScript**, and **MongoDB**.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Customer Journey](#-the-customer-journey)
- [Technical Architecture](#-technical-architecture)
- [State Machine](#-state-machine-conversation-flow)
- [Database Schema](#-what-gets-stored-in-mongodb)
- [External Integrations](#-external-integrations)
- [Admin Features](#-admin-features)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [API Endpoints](#-api-endpoints)
- [Configuration](#-configuration)
- [Deployment](#-deployment)
- [Resources](#-resources)

---

## Overview

This system automates the entire order flow on WhatsApp:

| Feature | Description |
|---------|-------------|
| **WhatsApp Native Catalog** | Customers browse products directly in WhatsApp |
| **Automated Order Flow** | Cart → Address → Payment → Confirmation |
| **Razorpay Integration** | Secure payment links with webhook handling |
| **SMS Notifications** | Order confirmations via MSG91/Twilio |
| **MongoDB Persistence** | Scalable data storage with proper indexing |
| **Clean Architecture** | Repository pattern, service layer, type safety |

---

## 🎯 The Customer Journey

What your customers experience:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CUSTOMER'S WHATSAPP EXPERIENCE                           │
└─────────────────────────────────────────────────────────────────────────────┘

📱 Step 1: Customer Messages You
   ↓
   Customer sends "Hi" or clicks your Instagram link
   ↓
   🤖 Bot responds with greeting + "View Collection" button

📱 Step 2: Browse & Select (Native Catalog)
   ↓
   Customer taps button → Opens YOUR product catalog IN WhatsApp
   ↓
   Customer browses photos, sees prices, taps "Add to Cart"
   ↓
   Customer sends their cart when ready

📱 Step 3: Address Collection
   ↓
   🤖 Bot shows cart summary with total price
   ↓
   🤖 Bot asks: "Please send your delivery address"
   ↓
   Customer types their full address

📱 Step 4: Payment
   ↓
   🤖 Bot generates Razorpay payment link
   ↓
   🤖 Bot sends: "Total ₹2500. Click to pay: [link]"
   ↓
   Customer pays securely via Razorpay

📱 Step 5: Confirmation
   ↓
   🤖 Bot sends "Order Confirmed!" message
   ↓
   📲 SMS sent to customer + business owner
```

### Why This Flow is Better

| Old Way | Our Way |
|---------|---------|
| Send website link | Browse in WhatsApp |
| Customer types product IDs | Visual selection, tap to add |
| Manual order processing | Fully automated |
| Multiple app switching | Everything in one place |

---

## 🏗️ Technical Architecture

### System Components

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         YOUR SERVER (Bun + Elysia)                       │
│                                                                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                 │
│  │   Routes    │───▶│  Handlers   │───▶│  Services   │                 │
│  │  (Webhooks) │    │(State Logic)│    │ (API Calls) │                 │
│  └─────────────┘    └─────────────┘    └─────────────┘                 │
│         │                  │                  │                         │
│         ▼                  ▼                  ▼                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                 Repositories (Data Layer)                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                            │                                            │
└────────────────────────────│────────────────────────────────────────────┘
                             ▼
                     ┌───────────────┐
                     │   MongoDB     │
                     │  (Database)   │
                     └───────────────┘

External Services:
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  WhatsApp    │    │   Razorpay   │    │  SMS Gateway │
│  Cloud API   │    │  (Payments)  │    │(MSG91/Twilio)│
└──────────────┘    └──────────────┘    └──────────────┘
```

### What Each Layer Does

| Layer | Files | Purpose |
|-------|-------|---------|
| **Routes** | `whatsapp.routes.ts`, `razorpay.routes.ts` | Receive webhooks from WhatsApp & Razorpay |
| **Handlers** | `message.handler.ts`, `order.handler.ts` | Process messages, manage conversation state |
| **Services** | `whatsapp.service.ts`, `razorpay.service.ts`, `sms.service.ts` | Call external APIs |
| **Repositories** | `conversation.repository.ts`, `order.repository.ts` | Read/write database |
| **Models** | `conversation.model.ts`, `order.model.ts` | Define data structure |

### Design Patterns Used

| Pattern | Where | Purpose |
|---------|-------|---------|
| **Repository** | `/repositories/` | Abstract database operations |
| **Service Layer** | `/services/` | Encapsulate business logic |
| **State Machine** | `message.handler.ts` | Manage conversation flow |
| **Singleton** | All services/repos | Single instance across app |

---

## 🔄 State Machine (Conversation Flow)

The bot tracks where each customer is in their order journey:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CONVERSATION STATES                               │
└─────────────────────────────────────────────────────────────────────────┘

    ┌─────────┐                    
    │   NEW   │  ← First message received
    └────┬────┘                    
         │ Send greeting + catalog button
         ▼                         
    ┌──────────┐                   
    │ BROWSING │  ← Customer exploring catalog
    └────┬─────┘                   
         │ Cart/order message received
         ▼                         
┌─────────────────┐                
│ AWAITING_ADDRESS│  ← Waiting for delivery address
└────────┬────────┘                
         │ Address text received
         ▼                         
┌─────────────────┐                
│ AWAITING_PAYMENT│  ← Payment link sent, waiting for payment
└────────┬────────┘                
         │ Payment confirmed via webhook
         ▼                         
    ┌───────────┐                  
    │ COMPLETED │  ← Order done! 🎉
    └───────────┘                  
```

### State Transitions

| From State | Trigger | To State |
|------------|---------|----------|
| NEW | Any message | BROWSING |
| BROWSING | Order/cart received | AWAITING_ADDRESS |
| AWAITING_ADDRESS | Valid address text | AWAITING_PAYMENT |
| AWAITING_PAYMENT | Payment webhook | COMPLETED |
| Any state | "restart" command | BROWSING |

---

## 📦 What Gets Stored in MongoDB

### 1. Conversations Collection

Tracks each customer's current state:

```javascript
{
  phoneNumber: "919876543210",
  customerName: "Priya",
  state: "AWAITING_PAYMENT",
  cart: {
    catalogId: "12345",
    items: [
      { productId: "SAREE_001", quantity: 1, priceInRupees: 1500 },
      { productId: "SAREE_002", quantity: 2, priceInRupees: 1000 }
    ],
    totalInRupees: 3500
  },
  address: "123 MG Road, Bengaluru, Karnataka 560001",
  orderId: "ORD-ABC123",
  paymentLinkId: "plink_xyz",
  paymentLinkUrl: "https://rzp.io/abc",
  lastMessageAt: "2026-01-13T10:00:00Z",
  createdAt: "2026-01-13T09:30:00Z",
  updatedAt: "2026-01-13T10:00:00Z"
}
```

### 2. Orders Collection

Permanent record of all orders:

```javascript
{
  orderId: "ORD-ABC123",
  phoneNumber: "919876543210",
  customerName: "Priya",
  items: [
    { productId: "SAREE_001", quantity: 1, priceInRupees: 1500, totalInRupees: 1500 },
    { productId: "SAREE_002", quantity: 2, priceInRupees: 1000, totalInRupees: 2000 }
  ],
  totalAmount: 3500,
  currency: "INR",
  shippingAddress: {
    fullAddress: "123 MG Road, Bengaluru, Karnataka 560001",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560001",
    country: "India"
  },
  payment: {
    paymentLinkId: "plink_xyz",
    paymentLinkUrl: "https://rzp.io/abc",
    paymentId: "pay_abc123",
    amount: 3500,
    currency: "INR",
    status: "PAID",
    paidAt: "2026-01-13T10:30:00Z",
    method: "upi"
  },
  status: "CONFIRMED",
  createdAt: "2026-01-13T10:00:00Z",
  updatedAt: "2026-01-13T10:30:00Z"
}
```

---

## 🔌 External Integrations

### 1. WhatsApp Cloud API

| Direction | Message Types |
|-----------|---------------|
| **Outgoing** | Text, Buttons, Catalog, Product List |
| **Incoming** | Text, Order (cart), Interactive (button clicks) |

### 2. Razorpay

| Feature | Usage |
|---------|-------|
| **Payment Links** | Create links with specific amounts |
| **Webhooks** | Receive payment success/failure notifications |
| **Refunds** | Initiate refunds when needed |

### 3. SMS Gateway (MSG91/Twilio)

| Notification | Recipient |
|--------------|-----------|
| Order Confirmation | Customer |
| New Order Alert | Business Owner |
| Shipping Update | Customer |

---

## 🛠️ Admin Features

Built-in admin endpoints for order management:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/orders` | GET | List all orders |
| `/admin/orders/:id` | GET | Get specific order |
| `/admin/orders/:id/status` | PATCH | Update status (SHIPPED, DELIVERED) |
| `/admin/customers/:phone/orders` | GET | Customer's order history |
| `/admin/conversations/:phone` | GET | View conversation state |
| `/admin/conversations/:phone/reset` | POST | Reset stuck conversation |
| `/admin/send-message` | POST | Send manual WhatsApp message |

> ⚠️ **Security Note**: Add authentication middleware to these routes in production!

---

## 📁 Project Structure

```
whatsapp-automation/
├── src/
│   ├── index.ts                    # Application entry point
│   │
│   ├── config/
│   │   ├── env.ts                  # Zod-validated environment config
│   │   └── database.ts             # MongoDB connection
│   │
│   ├── domain/
│   │   ├── types/                  # TypeScript interfaces
│   │   │   ├── conversation.types.ts
│   │   │   ├── order.types.ts
│   │   │   ├── whatsapp.types.ts
│   │   │   └── razorpay.types.ts
│   │   └── models/                 # Mongoose schemas
│   │       ├── conversation.model.ts
│   │       └── order.model.ts
│   │
│   ├── repositories/               # Data access layer
│   │   ├── base.repository.ts      # Generic CRUD operations
│   │   ├── conversation.repository.ts
│   │   └── order.repository.ts
│   │
│   ├── services/                   # External API integrations
│   │   ├── whatsapp.service.ts     # WhatsApp Cloud API
│   │   ├── razorpay.service.ts     # Payment links
│   │   └── sms.service.ts          # SMS notifications
│   │
│   ├── handlers/                   # Business logic
│   │   ├── message.handler.ts      # State machine logic
│   │   └── order.handler.ts        # Order processing
│   │
│   ├── routes/                     # Elysia routes
│   │   ├── whatsapp.routes.ts      # WhatsApp webhooks
│   │   ├── razorpay.routes.ts      # Payment webhooks
│   │   ├── health.routes.ts        # Health checks
│   │   └── admin.routes.ts         # Admin endpoints
│   │
│   └── utils/
│       └── logger.ts               # Pino logger
│
├── package.json
├── tsconfig.json
├── bunfig.toml
├── env.example
├── README.md
└── IMPLEMENTATION_GUIDE.md
```

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) >= 1.0
- MongoDB >= 6.0
- Meta Business Account with WhatsApp Business API
- Razorpay Account
- (Optional) MSG91 or Twilio for SMS

### Installation

```bash
# Clone or navigate to project
cd whatsapp-automation

# Install dependencies
bun install

# Copy environment template
cp env.example .env

# Edit .env with your credentials
nano .env
```

### Running the Server

```bash
# Development (with hot reload)
bun run dev

# Production
bun run start
```

### Webhook Testing (Local Development)

```bash
# Terminal 1: Start server
bun run dev

# Terminal 2: Expose with ngrok
ngrok http 3000

# Use the ngrok URL for webhook configuration
# Example: https://abc123.ngrok.io/webhook/whatsapp
```

---

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
| GET | `/stats` | Conversation & order statistics |

### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/orders` | List all orders |
| GET | `/admin/orders/:id` | Get order by ID |
| PATCH | `/admin/orders/:id/status` | Update order status |
| GET | `/admin/customers/:phone/orders` | Customer orders |
| POST | `/admin/conversations/:phone/reset` | Reset conversation |
| POST | `/admin/send-message` | Send manual message |

---

## ⚙️ Configuration

### Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development
APP_URL=https://your-domain.com

# MongoDB
MONGODB_URI=mongodb://localhost:27017/whatsapp-catalog

# WhatsApp Cloud API
WHATSAPP_PHONE_NUMBER_ID=1234567890
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxx
WHATSAPP_VERIFY_TOKEN=my-secret-token
WHATSAPP_CATALOG_ID=123456789

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_WEBHOOK_SECRET=xxx

# SMS (Optional)
SMS_API_KEY=xxx
SMS_SENDER_ID=YOURBR

# Business
BUSINESS_NAME=Your Store
BUSINESS_PHONE=+919876543210
```

### WhatsApp Setup

1. Go to [Meta Developer Dashboard](https://developers.facebook.com)
2. Create/select your app → Add WhatsApp product
3. Get Phone Number ID and Access Token from API Setup
4. Configure webhook URL: `https://your-domain.com/webhook/whatsapp`
5. Subscribe to `messages` webhook field

### Product Catalog Setup

1. Go to [Commerce Manager](https://business.facebook.com/commerce)
2. Create a catalog → Add products with Retailer IDs
3. Link catalog to WhatsApp Business Account

### Razorpay Setup

1. Get API keys from [Razorpay Dashboard](https://dashboard.razorpay.com/app/keys)
2. Configure webhook: `https://your-domain.com/webhook/razorpay`
3. Select events: `payment_link.paid`, `payment_link.expired`
4. Save webhook secret

---

## 🚀 Deployment

### Using PM2

```bash
# Start with PM2
pm2 start bun --name whatsapp-bot -- run start

# View logs
pm2 logs whatsapp-bot
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

```bash
# Build and run
docker build -t whatsapp-bot .
docker run -p 3000:3000 --env-file .env whatsapp-bot
```

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use production MongoDB (Atlas, etc.)
- [ ] Use live Razorpay keys
- [ ] Add authentication to admin routes
- [ ] Set up SSL/HTTPS
- [ ] Configure proper logging
- [ ] Set up monitoring (health checks)

---

## 🧪 Testing

### Test Cards (Razorpay)

| Field | Value |
|-------|-------|
| Card Number | `4111 1111 1111 1111` |
| Expiry | Any future date |
| CVV | Any 3 digits |

### Test Flow

1. Send "Hi" to your WhatsApp Business number
2. Click "View Collection" button
3. Add items to cart, send cart
4. Send a test address
5. Click payment link, use test card
6. Verify order confirmation received

---

## 🔒 Security Considerations

1. **Webhook Signatures** - Always verify Razorpay signatures
2. **Access Tokens** - Rotate WhatsApp tokens periodically
3. **Admin Routes** - Add authentication in production
4. **Environment Variables** - Never commit `.env` file
5. **Rate Limiting** - Consider adding for webhooks
6. **Input Validation** - Zod validates all config

---

## 📚 Resources

### Official Documentation

- [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [WhatsApp Commerce](https://developers.facebook.com/docs/whatsapp/commerce)
- [Razorpay Payment Links](https://razorpay.com/docs/payment-links/)
- [Elysia Documentation](https://elysiajs.com/)
- [Bun Documentation](https://bun.sh/docs)

### Setup Guides

- [Create Meta Business Account](https://business.facebook.com)
- [Meta Commerce Manager](https://business.facebook.com/commerce)
- [Razorpay Dashboard](https://dashboard.razorpay.com)

---

## 📄 License

MIT

---

## 🙏 Support

If you need help:
1. Check the [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) for detailed setup
2. Review WhatsApp Cloud API error codes
3. Check Razorpay webhook logs in dashboard

---

Built with ❤️ using Bun, Elysia, TypeScript, and MongoDB
