# WhatsApp Native Catalog Automation - Complete Implementation Guide

> A comprehensive guide to implementing a WhatsApp-based e-commerce automation system with native catalog support, Razorpay payments, and SMS notifications.

---

## Table of Contents

1. [Flow Overview](#flow-overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Project Structure](#project-structure)
5. [Phase 1: Project Setup](#phase-1-project-setup)
6. [Phase 2: WhatsApp Webhook Handler](#phase-2-whatsapp-webhook-handler)
7. [Phase 3: Conversation State Machine](#phase-3-conversation-state-machine)
8. [Phase 4: Cart/Order Detection](#phase-4-cartorder-detection)
9. [Phase 5: Razorpay Payment Integration](#phase-5-razorpay-payment-integration)
10. [Phase 6: Payment Webhook](#phase-6-payment-webhook)
11. [Phase 7: SMS Notifications](#phase-7-sms-notifications)
12. [Environment Configuration](#environment-configuration)
13. [Deployment Guide](#deployment-guide)
14. [Testing Strategy](#testing-strategy)
15. [Troubleshooting](#troubleshooting)

---

## Flow Overview

### The Customer Journey

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        WHATSAPP NATIVE CATALOG FLOW                         │
└─────────────────────────────────────────────────────────────────────────────┘

Step 1: CUSTOMER ENTRY
━━━━━━━━━━━━━━━━━━━━━━
Customer clicks Instagram link/DM
         │
         ▼
┌─────────────────────────────────┐
│  Bot sends Greeting Message     │
│  with "View Collection" button  │
│  (Opens WhatsApp Catalog)       │
└─────────────────────────────────┘

Step 2: SELECTION (Native Catalog)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Customer browses photos IN WhatsApp
         │
         ▼
┌─────────────────────────────────┐
│  Customer clicks "Add to Cart"  │
│  on items they like             │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Customer sends Cart as message │
└─────────────────────────────────┘

Step 3: ADDRESS COLLECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━
Bot detects cart was sent
         │
         ▼
┌─────────────────────────────────┐
│  Bot replies: "Great choice!    │
│  Please reply with your         │
│  Full Address for shipping"     │
└─────────────────────────────────┘

Step 4: PAYMENT GENERATION
━━━━━━━━━━━━━━━━━━━━━━━━━━
Customer sends address
         │
         ▼
┌─────────────────────────────────┐
│  Bot captures address           │
│  Bot calculates total from cart │
│  Bot generates Razorpay link    │
│  Bot sends payment link         │
└─────────────────────────────────┘

Step 5: CONFIRMATION
━━━━━━━━━━━━━━━━━━━━
Customer completes payment
         │
         ▼
┌─────────────────────────────────┐
│  Razorpay webhook confirms      │
│  Bot sends "Order Confirmed"    │
│  SMS sent to you & customer     │
└─────────────────────────────────┘
```

---

## Architecture

### System Architecture Diagram

```
                                    ┌─────────────────────────────────────┐
                                    │           YOUR SERVER               │
                                    │         (Node.js/Express)           │
                                    │                                     │
┌──────────────┐                    │  ┌─────────────────────────────┐   │
│   Customer   │                    │  │     Webhook Handlers        │   │
│  (WhatsApp)  │◀──────────────────▶│  │  • /webhook/whatsapp        │   │
└──────────────┘                    │  │  • /webhook/razorpay        │   │
       │                            │  └─────────────────────────────┘   │
       │                            │              │                     │
       │                            │              ▼                     │
       │                            │  ┌─────────────────────────────┐   │
       │    WhatsApp Cloud API      │  │    Message Handler          │   │
       │◀──────────────────────────▶│  │  • Greeting flow            │   │
       │                            │  │  • Cart detection           │   │
       │                            │  │  • Address collection       │   │
       │                            │  └─────────────────────────────┘   │
       │                            │              │                     │
       │                            │              ▼                     │
       │                            │  ┌─────────────────────────────┐   │
       │                            │  │   Conversation State        │   │
       │                            │  │  • Redis/In-memory store    │   │
       │                            │  │  • Order tracking           │   │
       │                            │  └─────────────────────────────┘   │
       │                            │              │                     │
       │                            │              ▼                     │
       │                            │  ┌─────────────────────────────┐   │
       │                            │  │      External APIs          │   │
       │                            │  │  • Razorpay (payments)      │   │
       │                            │  │  • SMS Gateway              │   │
       │                            │  └─────────────────────────────┘   │
       │                            │                                     │
       │                            └─────────────────────────────────────┘
       │
       │
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Razorpay   │     │  SMS Gateway │     │    Meta      │
│  (Payments)  │     │  (Twilio/    │     │  Commerce    │
│              │     │   MSG91)     │     │  (Catalog)   │
└──────────────┘     └──────────────┘     └──────────────┘
```

### Data Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW                                      │
└────────────────────────────────────────────────────────────────────────────┘

1. INCOMING MESSAGE FLOW
   ─────────────────────
   WhatsApp → Meta Cloud API → Your Webhook → Message Handler → Response

2. OUTGOING MESSAGE FLOW
   ─────────────────────
   Your Server → WhatsApp Cloud API → Meta Servers → Customer's WhatsApp

3. PAYMENT FLOW
   ────────────
   Your Server → Razorpay API → Payment Link Created
   Customer → Pays on Razorpay → Razorpay Webhook → Your Server → Confirmation

4. SMS FLOW
   ────────
   Your Server → SMS API (Twilio/MSG91) → Carrier → Customer's Phone
```

---

## Prerequisites

### Required Accounts & Access

| Requirement | Description | How to Get It |
|-------------|-------------|---------------|
| **Meta Business Account** | Required for WhatsApp Business API | [business.facebook.com](https://business.facebook.com) |
| **WhatsApp Business API** | Cloud API access | [developers.facebook.com](https://developers.facebook.com) |
| **Meta Commerce Manager** | For product catalog | [business.facebook.com/commerce](https://business.facebook.com/commerce) |
| **Razorpay Account** | Payment gateway | [razorpay.com](https://razorpay.com) |
| **SMS Provider** | For notifications | Twilio, MSG91, or Gupshup |
| **Server with HTTPS** | Public endpoint for webhooks | Heroku, Railway, AWS, etc. |

### Setting Up WhatsApp Business API

#### Step 1: Create Meta Developer App

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Click "My Apps" → "Create App"
3. Select "Business" type
4. Add "WhatsApp" product to your app

#### Step 2: Get API Credentials

```
From Meta Developer Dashboard:
├── Phone Number ID: Found in WhatsApp > API Setup
├── Access Token: Generate in WhatsApp > API Setup
├── Business Account ID: Found in Business Settings
└── Verify Token: You create this (any random string)
```

#### Step 3: Create Product Catalog

1. Go to [Commerce Manager](https://business.facebook.com/commerce)
2. Create a new catalog
3. Add products with:
   - Product Name
   - Description
   - Price
   - Images
   - Retailer ID (unique identifier)
4. Link catalog to your WhatsApp Business Account

---

## Project Structure

```
whatsapp-automation/
│
├── src/
│   │
│   ├── index.js                    # Application entry point
│   │
│   ├── config/
│   │   └── env.js                  # Environment configuration
│   │
│   ├── routes/
│   │   ├── whatsapp.routes.js      # WhatsApp webhook endpoints
│   │   └── razorpay.routes.js      # Razorpay webhook endpoints
│   │
│   ├── controllers/
│   │   ├── whatsapp.controller.js  # WhatsApp request handling
│   │   └── razorpay.controller.js  # Razorpay request handling
│   │
│   ├── services/
│   │   ├── whatsapp.service.js     # WhatsApp API interactions
│   │   ├── razorpay.service.js     # Razorpay API interactions
│   │   └── sms.service.js          # SMS sending logic
│   │
│   ├── handlers/
│   │   ├── message.handler.js      # Message processing logic
│   │   └── order.handler.js        # Order/cart processing
│   │
│   ├── store/
│   │   └── conversation.store.js   # Conversation state management
│   │
│   ├── utils/
│   │   ├── logger.js               # Logging utility
│   │   └── helpers.js              # Helper functions
│   │
│   └── templates/
│       └── messages.js             # Message templates
│
├── .env.example                    # Environment variables template
├── .gitignore                      # Git ignore file
├── package.json                    # Dependencies
├── README.md                       # Project readme
└── IMPLEMENTATION_GUIDE.md         # This file
```

---

## Phase 1: Project Setup

### 1.1 Initialize Project

```bash
# Create project directory
mkdir whatsapp-automation
cd whatsapp-automation

# Initialize npm project
npm init -y

# Install dependencies
npm install express axios dotenv razorpay uuid

# Install dev dependencies
npm install -D nodemon
```

### 1.2 Package.json Configuration

```json
{
  "name": "whatsapp-catalog-automation",
  "version": "1.0.0",
  "description": "WhatsApp Native Catalog automation with Razorpay",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  },
  "dependencies": {
    "axios": "^1.6.2",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "razorpay": "^2.9.2",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

### 1.3 Environment Configuration

Create `src/config/env.js`:

```javascript
require('dotenv').config();

module.exports = {
  // Server
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // WhatsApp Cloud API
  WHATSAPP_API_URL: 'https://graph.facebook.com/v18.0',
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
  WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN,
  WHATSAPP_CATALOG_ID: process.env.WHATSAPP_CATALOG_ID,

  // Razorpay
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,

  // SMS (MSG91 example)
  SMS_API_KEY: process.env.SMS_API_KEY,
  SMS_SENDER_ID: process.env.SMS_SENDER_ID,

  // Business Info
  BUSINESS_PHONE: process.env.BUSINESS_PHONE,
  BUSINESS_NAME: process.env.BUSINESS_NAME || 'Your Store',

  // App URL (for webhooks)
  APP_URL: process.env.APP_URL
};
```

### 1.4 Main Entry Point

Create `src/index.js`:

```javascript
const express = require('express');
const config = require('./config/env');

// Import routes
const whatsappRoutes = require('./routes/whatsapp.routes');
const razorpayRoutes = require('./routes/razorpay.routes');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/webhook/whatsapp', whatsappRoutes);
app.use('/webhook/razorpay', razorpayRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(config.PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║     WhatsApp Catalog Automation Server                    ║
╠═══════════════════════════════════════════════════════════╣
║  Status:    Running                                       ║
║  Port:      ${config.PORT}                                         ║
║  Mode:      ${config.NODE_ENV}                               ║
║                                                           ║
║  Webhooks:                                                ║
║  • WhatsApp: /webhook/whatsapp                            ║
║  • Razorpay: /webhook/razorpay                            ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
```

---

## Phase 2: WhatsApp Webhook Handler

### 2.1 Understanding WhatsApp Webhooks

WhatsApp Cloud API uses webhooks to notify you of incoming messages. You need two endpoints:

| Method | Purpose | When Used |
|--------|---------|-----------|
| `GET /webhook/whatsapp` | Verification | One-time setup to verify your webhook URL |
| `POST /webhook/whatsapp` | Messages | Every time a customer sends a message |

### 2.2 Webhook Routes

Create `src/routes/whatsapp.routes.js`:

```javascript
const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsapp.controller');

// Webhook verification (GET) - Called by Meta to verify your endpoint
router.get('/', whatsappController.verifyWebhook);

// Webhook handler (POST) - Receives all incoming messages
router.post('/', whatsappController.handleWebhook);

module.exports = router;
```

### 2.3 Webhook Controller

Create `src/controllers/whatsapp.controller.js`:

```javascript
const config = require('../config/env');
const messageHandler = require('../handlers/message.handler');

/**
 * Verify webhook - Called by Meta when you first register your webhook URL
 * Meta sends: hub.mode, hub.verify_token, hub.challenge
 * You must respond with hub.challenge if token matches
 */
exports.verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('Webhook verification request:', { mode, token });

  if (mode === 'subscribe' && token === config.WHATSAPP_VERIFY_TOKEN) {
    console.log('✅ Webhook verified successfully');
    return res.status(200).send(challenge);
  }

  console.log('❌ Webhook verification failed');
  return res.sendStatus(403);
};

/**
 * Handle incoming webhook - Receives all messages and events
 */
exports.handleWebhook = async (req, res) => {
  try {
    const body = req.body;

    // WhatsApp sends updates in this structure
    if (body.object === 'whatsapp_business_account') {
      
      // Process each entry
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          
          if (change.field === 'messages') {
            const value = change.value;
            
            // Get message details
            const messages = value.messages || [];
            const contacts = value.contacts || [];

            for (let i = 0; i < messages.length; i++) {
              const message = messages[i];
              const contact = contacts[i] || {};

              // Process the message
              await messageHandler.processMessage({
                from: message.from,           // Customer phone number
                name: contact.profile?.name,  // Customer name
                type: message.type,           // text, order, interactive, etc.
                message: message,             // Full message object
                timestamp: message.timestamp
              });
            }
          }
        }
      }

      // Always respond with 200 OK quickly to acknowledge receipt
      return res.sendStatus(200);
    }

    return res.sendStatus(404);
  } catch (error) {
    console.error('Webhook error:', error);
    // Still return 200 to prevent Meta from retrying
    return res.sendStatus(200);
  }
};
```

### 2.4 Incoming Message Structure Reference

```javascript
// TEXT MESSAGE
{
  "from": "919876543210",
  "id": "wamid.xxx",
  "timestamp": "1234567890",
  "type": "text",
  "text": {
    "body": "Hello, I want to order"
  }
}

// ORDER MESSAGE (When customer sends cart)
{
  "from": "919876543210",
  "id": "wamid.xxx",
  "timestamp": "1234567890",
  "type": "order",
  "order": {
    "catalog_id": "123456789",
    "product_items": [
      {
        "product_retailer_id": "SAREE_001",
        "quantity": 1,
        "item_price": 150000,  // In paise (₹1500)
        "currency": "INR"
      }
    ]
  }
}

// INTERACTIVE MESSAGE (Button reply)
{
  "from": "919876543210",
  "id": "wamid.xxx",
  "timestamp": "1234567890",
  "type": "interactive",
  "interactive": {
    "type": "button_reply",
    "button_reply": {
      "id": "view_catalog",
      "title": "View Collection"
    }
  }
}
```

---

## Phase 3: Conversation State Machine

### 3.1 State Definitions

```javascript
// Possible states a customer can be in
const STATES = {
  NEW: 'NEW',                       // First time messaging
  BROWSING: 'BROWSING',             // Sent greeting, browsing catalog
  AWAITING_ADDRESS: 'AWAITING_ADDRESS',  // Cart received, waiting for address
  AWAITING_PAYMENT: 'AWAITING_PAYMENT',  // Address received, payment link sent
  COMPLETED: 'COMPLETED'            // Order completed
};
```

### 3.2 State Transitions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STATE MACHINE DIAGRAM                                │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────┐
                              │   NEW   │
                              └────┬────┘
                                   │
                        First message received
                        Send greeting + catalog button
                                   │
                                   ▼
                            ┌───────────┐
                            │ BROWSING  │◀─────────────────┐
                            └─────┬─────┘                  │
                                  │                        │
                         Order/Cart received               │
                         Ask for address                   │
                                  │                        │
                                  ▼                        │
                       ┌──────────────────┐                │
                       │ AWAITING_ADDRESS │                │
                       └────────┬─────────┘                │
                                │                          │
                      Address text received                │
                      Generate payment link                │
                                │                          │
                                ▼                          │
                       ┌──────────────────┐                │
                       │ AWAITING_PAYMENT │────────────────┘
                       └────────┬─────────┘    (timeout/cancel)
                                │
                     Payment webhook received
                     Send confirmation + SMS
                                │
                                ▼
                          ┌───────────┐
                          │ COMPLETED │
                          └───────────┘
```

### 3.3 Conversation Store

Create `src/store/conversation.store.js`:

```javascript
/**
 * In-memory conversation store
 * For production, replace with Redis or database
 */

const conversations = new Map();

const STATES = {
  NEW: 'NEW',
  BROWSING: 'BROWSING',
  AWAITING_ADDRESS: 'AWAITING_ADDRESS',
  AWAITING_PAYMENT: 'AWAITING_PAYMENT',
  COMPLETED: 'COMPLETED'
};

/**
 * Get or create conversation for a phone number
 */
function getConversation(phoneNumber) {
  if (!conversations.has(phoneNumber)) {
    conversations.set(phoneNumber, {
      phoneNumber,
      state: STATES.NEW,
      customerName: null,
      cart: null,
      cartTotal: 0,
      address: null,
      paymentLinkId: null,
      orderId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  return conversations.get(phoneNumber);
}

/**
 * Update conversation
 */
function updateConversation(phoneNumber, updates) {
  const conversation = getConversation(phoneNumber);
  Object.assign(conversation, updates, { updatedAt: new Date() });
  conversations.set(phoneNumber, conversation);
  return conversation;
}

/**
 * Find conversation by payment link ID
 */
function findByPaymentLinkId(paymentLinkId) {
  for (const [phoneNumber, conversation] of conversations) {
    if (conversation.paymentLinkId === paymentLinkId) {
      return conversation;
    }
  }
  return null;
}

/**
 * Reset conversation to initial state
 */
function resetConversation(phoneNumber) {
  const conversation = getConversation(phoneNumber);
  return updateConversation(phoneNumber, {
    state: STATES.BROWSING,
    cart: null,
    cartTotal: 0,
    address: null,
    paymentLinkId: null,
    orderId: null
  });
}

/**
 * Get all active conversations (for debugging)
 */
function getAllConversations() {
  return Array.from(conversations.values());
}

module.exports = {
  STATES,
  getConversation,
  updateConversation,
  findByPaymentLinkId,
  resetConversation,
  getAllConversations
};
```

---

## Phase 4: Cart/Order Detection

### 4.1 Message Handler

Create `src/handlers/message.handler.js`:

```javascript
const conversationStore = require('../store/conversation.store');
const whatsappService = require('../services/whatsapp.service');
const orderHandler = require('./order.handler');
const { STATES } = conversationStore;

/**
 * Main message processor - Routes messages based on type and state
 */
async function processMessage({ from, name, type, message, timestamp }) {
  console.log(`\n📨 Message from ${from} (${name}): type=${type}`);
  
  // Get current conversation state
  const conversation = conversationStore.getConversation(from);
  
  // Update customer name if available
  if (name && !conversation.customerName) {
    conversationStore.updateConversation(from, { customerName: name });
  }

  // Route based on message type
  switch (type) {
    case 'text':
      await handleTextMessage(from, message.text.body, conversation);
      break;
    
    case 'order':
      await handleOrderMessage(from, message.order, conversation);
      break;
    
    case 'interactive':
      await handleInteractiveMessage(from, message.interactive, conversation);
      break;
    
    default:
      console.log(`Unhandled message type: ${type}`);
      await whatsappService.sendTextMessage(
        from,
        "Sorry, I can only process text messages and orders. Please send your order from the catalog or type your message."
      );
  }
}

/**
 * Handle regular text messages
 */
async function handleTextMessage(from, text, conversation) {
  console.log(`💬 Text: "${text}" | State: ${conversation.state}`);

  switch (conversation.state) {
    case STATES.NEW:
      // First time customer - send greeting with catalog
      await sendGreetingWithCatalog(from);
      conversationStore.updateConversation(from, { state: STATES.BROWSING });
      break;

    case STATES.BROWSING:
      // Customer is browsing - remind them to use catalog
      await whatsappService.sendTextMessage(
        from,
        "Please browse our collection and add items to your cart! 🛒\n\nOnce you've selected your items, send your cart and I'll help you complete your order."
      );
      break;

    case STATES.AWAITING_ADDRESS:
      // This should be the address - process it
      await orderHandler.processAddress(from, text, conversation);
      break;

    case STATES.AWAITING_PAYMENT:
      // Customer sent message while waiting for payment
      await whatsappService.sendTextMessage(
        from,
        `Please complete your payment using the link I sent earlier.\n\nIf you need a new payment link or want to modify your order, just say "restart".`
      );
      
      // Handle restart command
      if (text.toLowerCase().includes('restart') || text.toLowerCase().includes('cancel')) {
        conversationStore.resetConversation(from);
        await sendGreetingWithCatalog(from);
      }
      break;

    default:
      await sendGreetingWithCatalog(from);
      conversationStore.updateConversation(from, { state: STATES.BROWSING });
  }
}

/**
 * Handle order/cart messages - THE KEY FUNCTION
 */
async function handleOrderMessage(from, order, conversation) {
  console.log(`🛒 Order received:`, JSON.stringify(order, null, 2));

  // Extract cart items
  const items = order.product_items || [];
  
  if (items.length === 0) {
    await whatsappService.sendTextMessage(
      from,
      "Your cart appears to be empty. Please add some items and try again!"
    );
    return;
  }

  // Calculate total (prices are in paise, convert to rupees for display)
  let totalPaise = 0;
  const itemDetails = items.map(item => {
    const itemTotal = item.item_price * item.quantity;
    totalPaise += itemTotal;
    return {
      productId: item.product_retailer_id,
      quantity: item.quantity,
      price: item.item_price / 100,  // Convert paise to rupees
      total: itemTotal / 100
    };
  });

  const totalRupees = totalPaise / 100;

  // Store cart in conversation
  conversationStore.updateConversation(from, {
    state: STATES.AWAITING_ADDRESS,
    cart: {
      catalogId: order.catalog_id,
      items: itemDetails,
      rawItems: items
    },
    cartTotal: totalRupees
  });

  // Build cart summary message
  let cartSummary = "✨ *Great choices!* Here's your order:\n\n";
  itemDetails.forEach((item, index) => {
    cartSummary += `${index + 1}. ${item.productId}\n`;
    cartSummary += `   Qty: ${item.quantity} × ₹${item.price} = ₹${item.total}\n`;
  });
  cartSummary += `\n*Total: ₹${totalRupees}*\n\n`;
  cartSummary += `📍 To calculate shipping and generate your bill, please reply with your *complete delivery address* including:\n`;
  cartSummary += `• House/Flat number\n`;
  cartSummary += `• Street name\n`;
  cartSummary += `• City, State\n`;
  cartSummary += `• PIN code`;

  await whatsappService.sendTextMessage(from, cartSummary);
}

/**
 * Handle interactive message replies (button clicks)
 */
async function handleInteractiveMessage(from, interactive, conversation) {
  const buttonReply = interactive.button_reply;
  const listReply = interactive.list_reply;

  if (buttonReply) {
    console.log(`🔘 Button clicked: ${buttonReply.id}`);
    
    if (buttonReply.id === 'view_catalog') {
      await whatsappService.sendCatalogMessage(from);
    }
  }

  if (listReply) {
    console.log(`📋 List item selected: ${listReply.id}`);
  }
}

/**
 * Send greeting message with View Collection button
 */
async function sendGreetingWithCatalog(from) {
  const greeting = `🙏 *Welcome to ${process.env.BUSINESS_NAME || 'Our Store'}!*\n\n` +
    `We have a beautiful collection of handpicked sarees waiting for you.\n\n` +
    `Click the button below to browse our collection. Add items you like to your cart, ` +
    `and send the cart when you're ready to order!`;

  await whatsappService.sendButtonMessage(from, greeting, [
    { id: 'view_catalog', title: 'View Collection 🛍️' }
  ]);
}

module.exports = {
  processMessage
};
```

### 4.2 Order Handler

Create `src/handlers/order.handler.js`:

```javascript
const conversationStore = require('../store/conversation.store');
const whatsappService = require('../services/whatsapp.service');
const razorpayService = require('../services/razorpay.service');
const { STATES } = conversationStore;
const { v4: uuidv4 } = require('uuid');

/**
 * Process customer address and generate payment link
 */
async function processAddress(from, addressText, conversation) {
  console.log(`📍 Address received from ${from}: ${addressText}`);

  // Basic address validation
  if (addressText.length < 20) {
    await whatsappService.sendTextMessage(
      from,
      "That address seems incomplete. Please provide your full delivery address including house number, street, city, state, and PIN code."
    );
    return;
  }

  // Store address
  const orderId = `ORD-${Date.now()}-${uuidv4().slice(0, 4).toUpperCase()}`;
  
  conversationStore.updateConversation(from, {
    address: addressText,
    orderId: orderId
  });

  // Send processing message
  await whatsappService.sendTextMessage(
    from,
    "📝 Address received! Generating your payment link..."
  );

  try {
    // Generate Razorpay payment link
    const paymentLink = await razorpayService.createPaymentLink({
      amount: conversation.cartTotal,
      customerPhone: from,
      customerName: conversation.customerName || 'Customer',
      orderId: orderId,
      description: `Order ${orderId} - ${conversation.cart.items.length} item(s)`
    });

    // Store payment link ID
    conversationStore.updateConversation(from, {
      state: STATES.AWAITING_PAYMENT,
      paymentLinkId: paymentLink.id
    });

    // Send payment link
    const paymentMessage = 
      `✅ *Order Summary*\n\n` +
      `Order ID: ${orderId}\n` +
      `Items: ${conversation.cart.items.length}\n` +
      `Total: *₹${conversation.cartTotal}*\n\n` +
      `📍 *Delivery Address:*\n${addressText}\n\n` +
      `💳 *Click below to pay securely:*\n${paymentLink.short_url}\n\n` +
      `_This link is valid for 24 hours._`;

    await whatsappService.sendTextMessage(from, paymentMessage);

  } catch (error) {
    console.error('Payment link creation failed:', error);
    await whatsappService.sendTextMessage(
      from,
      "Sorry, there was an issue generating your payment link. Please try again or contact us for assistance."
    );
  }
}

module.exports = {
  processAddress
};
```

---

## Phase 5: Razorpay Payment Integration

### 5.1 Razorpay Service

Create `src/services/razorpay.service.js`:

```javascript
const Razorpay = require('razorpay');
const config = require('../config/env');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: config.RAZORPAY_KEY_ID,
  key_secret: config.RAZORPAY_KEY_SECRET
});

/**
 * Create a payment link
 * 
 * @param {Object} options
 * @param {number} options.amount - Amount in rupees
 * @param {string} options.customerPhone - Customer phone number
 * @param {string} options.customerName - Customer name
 * @param {string} options.orderId - Your order ID
 * @param {string} options.description - Order description
 */
async function createPaymentLink({ amount, customerPhone, customerName, orderId, description }) {
  try {
    // Razorpay expects amount in paise
    const amountInPaise = Math.round(amount * 100);

    const paymentLink = await razorpay.paymentLink.create({
      amount: amountInPaise,
      currency: 'INR',
      accept_partial: false,
      reference_id: orderId,
      description: description,
      customer: {
        name: customerName,
        contact: `+${customerPhone}` // Ensure + prefix
      },
      notify: {
        sms: false,  // We'll send our own notifications
        email: false
      },
      reminder_enable: true,
      notes: {
        order_id: orderId,
        phone: customerPhone
      },
      callback_url: `${config.APP_URL}/payment/success`,
      callback_method: 'get',
      expire_by: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    });

    console.log('✅ Payment link created:', paymentLink.short_url);
    
    return {
      id: paymentLink.id,
      short_url: paymentLink.short_url,
      amount: amount,
      status: paymentLink.status
    };

  } catch (error) {
    console.error('Razorpay error:', error);
    throw error;
  }
}

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(body, signature) {
  const crypto = require('crypto');
  
  const expectedSignature = crypto
    .createHmac('sha256', config.RAZORPAY_WEBHOOK_SECRET)
    .update(JSON.stringify(body))
    .digest('hex');

  return expectedSignature === signature;
}

/**
 * Get payment link details
 */
async function getPaymentLink(paymentLinkId) {
  return await razorpay.paymentLink.fetch(paymentLinkId);
}

module.exports = {
  createPaymentLink,
  verifyWebhookSignature,
  getPaymentLink
};
```

### 5.2 Razorpay API Reference

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RAZORPAY PAYMENT LINKS API                          │
└─────────────────────────────────────────────────────────────────────────────┘

CREATE PAYMENT LINK
───────────────────
POST https://api.razorpay.com/v1/payment_links

Headers:
  Authorization: Basic base64(key_id:key_secret)
  Content-Type: application/json

Request Body:
{
  "amount": 250000,              // Amount in paise (₹2500 = 250000)
  "currency": "INR",
  "accept_partial": false,
  "reference_id": "ORD-12345",   // Your order ID
  "description": "Order for 2 sarees",
  "customer": {
    "name": "Customer Name",
    "contact": "+919876543210"
  },
  "notify": {
    "sms": false,
    "email": false
  },
  "callback_url": "https://yoursite.com/payment/success",
  "expire_by": 1735689600        // Unix timestamp
}

Response:
{
  "id": "plink_ExjpAUN3gVHrPJ",
  "amount": 250000,
  "currency": "INR",
  "short_url": "https://rzp.io/i/w2CEwYmkAu",
  "status": "created",
  ...
}
```

---

## Phase 6: Payment Webhook

### 6.1 Razorpay Routes

Create `src/routes/razorpay.routes.js`:

```javascript
const express = require('express');
const router = express.Router();
const razorpayController = require('../controllers/razorpay.controller');

// Payment webhook
router.post('/', razorpayController.handleWebhook);

module.exports = router;
```

### 6.2 Razorpay Controller

Create `src/controllers/razorpay.controller.js`:

```javascript
const razorpayService = require('../services/razorpay.service');
const whatsappService = require('../services/whatsapp.service');
const smsService = require('../services/sms.service');
const conversationStore = require('../store/conversation.store');
const config = require('../config/env');

/**
 * Handle Razorpay webhooks
 */
exports.handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const body = req.body;

    // Verify signature
    if (!razorpayService.verifyWebhookSignature(body, signature)) {
      console.log('❌ Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    console.log('📥 Razorpay webhook:', body.event);

    // Handle different events
    switch (body.event) {
      case 'payment_link.paid':
        await handlePaymentSuccess(body.payload.payment_link.entity);
        break;
      
      case 'payment_link.expired':
        await handlePaymentExpired(body.payload.payment_link.entity);
        break;
      
      default:
        console.log(`Unhandled event: ${body.event}`);
    }

    res.status(200).json({ status: 'ok' });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(paymentLink) {
  console.log('💰 Payment successful:', paymentLink.id);

  // Find conversation by payment link ID
  const conversation = conversationStore.findByPaymentLinkId(paymentLink.id);
  
  if (!conversation) {
    console.error('Conversation not found for payment link:', paymentLink.id);
    return;
  }

  const { phoneNumber, customerName, orderId, cartTotal, address, cart } = conversation;

  // Update state to completed
  conversationStore.updateConversation(phoneNumber, {
    state: conversationStore.STATES.COMPLETED
  });

  // Send WhatsApp confirmation to customer
  const confirmationMessage = 
    `🎉 *Payment Received!*\n\n` +
    `Thank you, ${customerName || 'valued customer'}!\n\n` +
    `✅ *Order Confirmed*\n` +
    `Order ID: ${orderId}\n` +
    `Amount Paid: ₹${cartTotal}\n\n` +
    `📦 Your order will be shipped within 2-3 business days.\n\n` +
    `📍 *Shipping to:*\n${address}\n\n` +
    `We'll send you tracking details once shipped.\n\n` +
    `Thank you for shopping with us! 🙏`;

  await whatsappService.sendTextMessage(phoneNumber, confirmationMessage);

  // Send SMS to customer
  await smsService.sendSMS(
    phoneNumber,
    `Order ${orderId} confirmed! Amount: ₹${cartTotal}. Thank you for shopping with ${config.BUSINESS_NAME}!`
  );

  // Send SMS to business owner
  const businessMessage = 
    `NEW ORDER!\n` +
    `ID: ${orderId}\n` +
    `Customer: ${customerName || phoneNumber}\n` +
    `Amount: ₹${cartTotal}\n` +
    `Items: ${cart.items.length}\n` +
    `Address: ${address.substring(0, 50)}...`;

  await smsService.sendSMS(config.BUSINESS_PHONE, businessMessage);

  console.log('✅ Order confirmation sent');
}

/**
 * Handle expired payment link
 */
async function handlePaymentExpired(paymentLink) {
  console.log('⏰ Payment link expired:', paymentLink.id);

  const conversation = conversationStore.findByPaymentLinkId(paymentLink.id);
  
  if (conversation) {
    await whatsappService.sendTextMessage(
      conversation.phoneNumber,
      `Your payment link has expired. Would you like to place the order again? Just say "restart" to begin fresh!`
    );
    
    // Reset conversation
    conversationStore.resetConversation(conversation.phoneNumber);
  }
}
```

### 6.3 Setting Up Razorpay Webhooks

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RAZORPAY WEBHOOK SETUP                                   │
└─────────────────────────────────────────────────────────────────────────────┘

1. Go to Razorpay Dashboard → Settings → Webhooks

2. Click "Add New Webhook"

3. Configure:
   • Webhook URL: https://your-server.com/webhook/razorpay
   • Secret: Generate a strong secret (save for RAZORPAY_WEBHOOK_SECRET)
   • Active Events:
     ☑ payment_link.paid
     ☑ payment_link.expired
     ☑ payment_link.cancelled (optional)

4. Save and test with a test payment

WEBHOOK EVENTS REFERENCE:
─────────────────────────
• payment_link.created   - When link is created
• payment_link.paid      - When payment is successful ✅
• payment_link.expired   - When link expires
• payment_link.cancelled - When link is cancelled
```

---

## Phase 7: SMS Notifications

### 7.1 SMS Service

Create `src/services/sms.service.js`:

```javascript
const axios = require('axios');
const config = require('../config/env');

/**
 * Send SMS using MSG91
 * You can replace this with Twilio or any other provider
 */
async function sendSMS(phoneNumber, message) {
  try {
    // Skip if no API key configured
    if (!config.SMS_API_KEY) {
      console.log(`📱 SMS (simulated) to ${phoneNumber}: ${message}`);
      return { success: true, simulated: true };
    }

    // Format phone number (remove + if present)
    const formattedPhone = phoneNumber.replace('+', '');

    // MSG91 API
    const response = await axios.post(
      'https://api.msg91.com/api/v5/flow/',
      {
        flow_id: config.SMS_FLOW_ID,
        sender: config.SMS_SENDER_ID,
        mobiles: formattedPhone,
        message: message
      },
      {
        headers: {
          'authkey': config.SMS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ SMS sent to ${phoneNumber}`);
    return { success: true, response: response.data };

  } catch (error) {
    console.error('SMS error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send SMS using Twilio (alternative)
 */
async function sendSMSTwilio(phoneNumber, message) {
  try {
    const accountSid = config.TWILIO_ACCOUNT_SID;
    const authToken = config.TWILIO_AUTH_TOKEN;
    const fromNumber = config.TWILIO_PHONE_NUMBER;

    if (!accountSid) {
      console.log(`📱 SMS (simulated) to ${phoneNumber}: ${message}`);
      return { success: true, simulated: true };
    }

    const response = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      new URLSearchParams({
        To: phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`,
        From: fromNumber,
        Body: message
      }),
      {
        auth: {
          username: accountSid,
          password: authToken
        }
      }
    );

    console.log(`✅ SMS sent to ${phoneNumber}`);
    return { success: true, sid: response.data.sid };

  } catch (error) {
    console.error('Twilio SMS error:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendSMS,
  sendSMSTwilio
};
```

### 7.2 SMS Provider Comparison

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SMS PROVIDER COMPARISON                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┬────────────────┬──────────────┬──────────────────────────────┐
│   Provider   │    Pricing     │   Best For   │          Features            │
├──────────────┼────────────────┼──────────────┼──────────────────────────────┤
│   MSG91      │  ~₹0.12/SMS    │    India     │ DLT compliant, OTP service   │
│              │                │              │ Templates, Bulk SMS          │
├──────────────┼────────────────┼──────────────┼──────────────────────────────┤
│   Twilio     │  ~$0.05/SMS    │ International│ Global reach, WhatsApp too   │
│              │  (~₹4/SMS)     │              │ Great API & docs             │
├──────────────┼────────────────┼──────────────┼──────────────────────────────┤
│   Gupshup    │  Variable      │ WhatsApp+SMS │ Both services in one         │
│              │                │              │ India focused                │
├──────────────┼────────────────┼──────────────┼──────────────────────────────┤
│   TextLocal  │  ~₹0.15/SMS    │    India     │ Simple API, good support     │
└──────────────┴────────────────┴──────────────┴──────────────────────────────┘

For India-only SMS, MSG91 or TextLocal are most cost-effective.
For international, use Twilio.
```

---

## WhatsApp Service

Create `src/services/whatsapp.service.js`:

```javascript
const axios = require('axios');
const config = require('../config/env');

const api = axios.create({
  baseURL: `${config.WHATSAPP_API_URL}/${config.WHATSAPP_PHONE_NUMBER_ID}`,
  headers: {
    'Authorization': `Bearer ${config.WHATSAPP_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

/**
 * Send a text message
 */
async function sendTextMessage(to, text) {
  try {
    const response = await api.post('/messages', {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'text',
      text: { body: text }
    });

    console.log(`✅ Text message sent to ${to}`);
    return response.data;

  } catch (error) {
    console.error('WhatsApp API error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Send a message with buttons
 */
async function sendButtonMessage(to, bodyText, buttons) {
  try {
    const response = await api.post('/messages', {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: bodyText },
        action: {
          buttons: buttons.map(btn => ({
            type: 'reply',
            reply: {
              id: btn.id,
              title: btn.title.substring(0, 20) // Max 20 chars
            }
          }))
        }
      }
    });

    console.log(`✅ Button message sent to ${to}`);
    return response.data;

  } catch (error) {
    console.error('WhatsApp API error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Send catalog message (Product List)
 */
async function sendCatalogMessage(to) {
  try {
    const response = await api.post('/messages', {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'interactive',
      interactive: {
        type: 'catalog_message',
        body: {
          text: 'Browse our beautiful collection! Tap on items to view details and add to cart.'
        },
        action: {
          name: 'catalog_message',
          parameters: {
            thumbnail_product_retailer_id: 'FEATURED_PRODUCT_ID' // Optional: your featured product ID
          }
        }
      }
    });

    console.log(`✅ Catalog message sent to ${to}`);
    return response.data;

  } catch (error) {
    console.error('WhatsApp API error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Send a specific product
 */
async function sendProductMessage(to, productId) {
  try {
    const response = await api.post('/messages', {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'interactive',
      interactive: {
        type: 'product',
        body: {
          text: 'Check out this item!'
        },
        action: {
          catalog_id: config.WHATSAPP_CATALOG_ID,
          product_retailer_id: productId
        }
      }
    });

    console.log(`✅ Product message sent to ${to}`);
    return response.data;

  } catch (error) {
    console.error('WhatsApp API error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Send multiple products (product list)
 */
async function sendProductListMessage(to, headerText, bodyText, sections) {
  try {
    const response = await api.post('/messages', {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'interactive',
      interactive: {
        type: 'product_list',
        header: {
          type: 'text',
          text: headerText
        },
        body: {
          text: bodyText
        },
        action: {
          catalog_id: config.WHATSAPP_CATALOG_ID,
          sections: sections
          // sections format:
          // [{ title: "Silk Sarees", product_items: [{ product_retailer_id: "SAREE_001" }] }]
        }
      }
    });

    console.log(`✅ Product list sent to ${to}`);
    return response.data;

  } catch (error) {
    console.error('WhatsApp API error:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  sendTextMessage,
  sendButtonMessage,
  sendCatalogMessage,
  sendProductMessage,
  sendProductListMessage
};
```

---

## Environment Configuration

### .env.example

Create `.env.example`:

```env
# ===========================================
# Server Configuration
# ===========================================
PORT=3000
NODE_ENV=development

# Your public server URL (for webhooks)
APP_URL=https://your-domain.com

# ===========================================
# WhatsApp Cloud API
# ===========================================
# Get from Meta Developer Dashboard > WhatsApp > API Setup
WHATSAPP_PHONE_NUMBER_ID=1234567890
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxx

# Create your own verify token (any random string)
WHATSAPP_VERIFY_TOKEN=my-secret-verify-token

# Get from Meta Commerce Manager
WHATSAPP_CATALOG_ID=123456789

# ===========================================
# Razorpay
# ===========================================
# Get from Razorpay Dashboard > Settings > API Keys
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx

# Get from Razorpay Dashboard > Settings > Webhooks
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxx

# ===========================================
# SMS Configuration (MSG91)
# ===========================================
SMS_API_KEY=your-msg91-auth-key
SMS_SENDER_ID=YOURBR
SMS_FLOW_ID=your-flow-id

# ===========================================
# SMS Configuration (Twilio - Alternative)
# ===========================================
# TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxx
# TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxx
# TWILIO_PHONE_NUMBER=+1234567890

# ===========================================
# Business Information
# ===========================================
BUSINESS_NAME=Your Saree Store
BUSINESS_PHONE=+919876543210
```

---

## Deployment Guide

### Option 1: Heroku

```bash
# Install Heroku CLI and login
heroku login

# Create app
heroku create your-whatsapp-bot

# Set environment variables
heroku config:set WHATSAPP_PHONE_NUMBER_ID=xxx
heroku config:set WHATSAPP_ACCESS_TOKEN=xxx
# ... set all other env vars

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

### Option 2: Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and init
railway login
railway init

# Deploy
railway up

# Set environment variables in Railway dashboard
```

### Option 3: DigitalOcean App Platform

1. Connect your GitHub repository
2. Configure environment variables in dashboard
3. Deploy automatically on push

### Option 4: VPS (DigitalOcean/AWS EC2)

```bash
# SSH into your server
ssh user@your-server-ip

# Clone repository
git clone https://github.com/yourusername/whatsapp-automation.git
cd whatsapp-automation

# Install dependencies
npm install

# Setup PM2 for process management
npm install -g pm2
pm2 start src/index.js --name whatsapp-bot

# Setup Nginx reverse proxy
sudo apt install nginx
# Configure nginx to proxy to your Node.js app

# Setup SSL with Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Testing Strategy

### Local Development with ngrok

```bash
# Install ngrok
npm install -g ngrok

# Start your server
npm run dev

# In another terminal, expose with ngrok
ngrok http 3000

# Use the ngrok URL for webhook configuration
# Example: https://abc123.ngrok.io/webhook/whatsapp
```

### Testing Checklist

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TESTING CHECKLIST                                  │
└─────────────────────────────────────────────────────────────────────────────┘

□ Webhook Verification
  □ GET /webhook/whatsapp returns challenge when token matches
  □ GET /webhook/whatsapp returns 403 when token doesn't match

□ Message Handling
  □ First message triggers greeting with catalog button
  □ "View Collection" button works
  □ Catalog displays correctly
  □ Order/cart message is detected
  □ Cart items are parsed correctly
  □ Total is calculated correctly
  □ Address prompt is sent

□ Address Collection
  □ Short address is rejected
  □ Valid address is accepted
  □ Payment link is generated
  □ Payment message is sent

□ Payment Flow
  □ Razorpay payment link works
  □ Payment webhook is received
  □ Signature is verified
  □ Confirmation message is sent
  □ SMS is sent to customer
  □ SMS is sent to business owner

□ Edge Cases
  □ "restart" command works
  □ Invalid message types are handled
  □ API errors are handled gracefully
  □ Expired payment links are handled
```

### Test Phone Numbers

```
WhatsApp Cloud API provides test phone numbers:
• Go to Meta Developer Dashboard
• WhatsApp > API Setup
• Use "To" number for testing
• Add your phone as a test recipient

Razorpay Test Mode:
• Use test API keys (rzp_test_xxx)
• Test card: 4111 1111 1111 1111
• Any future expiry, any CVV
```

---

## Troubleshooting

### Common Issues

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TROUBLESHOOTING GUIDE                                │
└─────────────────────────────────────────────────────────────────────────────┘

ISSUE: Webhook verification fails
─────────────────────────────────
• Check WHATSAPP_VERIFY_TOKEN matches what you entered in Meta Dashboard
• Ensure server is accessible via HTTPS
• Check server logs for the received token

ISSUE: Messages not being received
──────────────────────────────────
• Verify webhook URL is correct in Meta Dashboard
• Check that you've subscribed to "messages" webhook field
• Verify access token hasn't expired (regenerate if needed)
• Check server is returning 200 OK quickly

ISSUE: Order message not detected
─────────────────────────────────
• Ensure catalog is linked to your WhatsApp Business Account
• Check message.type === 'order' in your logs
• Verify catalog products have retailer IDs

ISSUE: Payment link not working
───────────────────────────────
• Check Razorpay API keys are correct
• Verify amount is in paise (multiply rupees by 100)
• Check customer phone format (+91xxxxxxxxxx)

ISSUE: SMS not sending
──────────────────────
• Verify SMS API key is correct
• Check phone number format
• For MSG91: Ensure DLT registration is complete
• Check SMS provider dashboard for errors

ISSUE: Webhook signature verification fails
───────────────────────────────────────────
• Ensure RAZORPAY_WEBHOOK_SECRET matches what's in Razorpay Dashboard
• Don't modify req.body before verification
• Use raw body for signature verification if needed
```

### Debug Mode

Add to your `.env`:

```env
DEBUG=true
```

Add debug logging:

```javascript
// In message.handler.js
if (process.env.DEBUG === 'true') {
  console.log('Full message object:', JSON.stringify(message, null, 2));
  console.log('Conversation state:', JSON.stringify(conversation, null, 2));
}
```

---

## Security Best Practices

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SECURITY CHECKLIST                                   │
└─────────────────────────────────────────────────────────────────────────────┘

□ Environment Variables
  □ Never commit .env file to git
  □ Use strong, unique verify tokens
  □ Rotate access tokens periodically

□ Webhook Security
  □ Always verify Razorpay webhook signatures
  □ Use HTTPS only
  □ Validate incoming data before processing

□ API Keys
  □ Use test keys during development
  □ Switch to live keys only in production
  □ Store secrets in environment variables

□ Data Protection
  □ Don't log sensitive customer data
  □ Clear old conversation data periodically
  □ Use database encryption for production

□ Rate Limiting
  □ Implement rate limiting on webhooks
  □ Add request throttling if needed
```

---

## Next Steps

After implementing this flow, consider:

1. **Database Integration**
   - Replace in-memory store with MongoDB/PostgreSQL
   - Store order history permanently

2. **Admin Dashboard**
   - Build a web dashboard to view orders
   - Manage products and inventory

3. **Automated Shipping Updates**
   - Integrate with shipping providers
   - Send tracking updates via WhatsApp

4. **Customer Support**
   - Add keyword detection for common queries
   - Implement handoff to human support

5. **Analytics**
   - Track conversion rates
   - Monitor cart abandonment
   - Analyze popular products

---

## Resources

### Official Documentation

- [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [WhatsApp Commerce](https://developers.facebook.com/docs/whatsapp/commerce)
- [Razorpay Payment Links](https://razorpay.com/docs/payment-links/)
- [MSG91 API](https://docs.msg91.com/)
- [Twilio SMS API](https://www.twilio.com/docs/sms)

### Meta Commerce Manager

- [Create Catalog](https://www.facebook.com/business/help/1275400645914358)
- [Link Catalog to WhatsApp](https://www.facebook.com/business/help/2169003770027706)

---

*Last Updated: January 2026*

