/**
 * Migration Script: Convert existing single-tenant data to multi-tenant
 *
 * This script:
 * 1. Creates a default tenant from current environment variables
 * 2. Updates all existing conversations with tenantId
 * 3. Updates all existing orders with tenantId
 *
 * Usage: bun run src/scripts/migrate-to-multi-tenant.ts
 */

import mongoose from 'mongoose';
import { config } from '../config/env';
import { TenantModel } from '../domain/models/tenant.model';
import { ConversationModel } from '../domain/models/conversation.model';
import { OrderModel } from '../domain/models/order.model';
import { encryptCredential, generateEncryptionKey } from '../utils/encryption';

async function migrate() {
  console.log('🚀 Starting multi-tenant migration...\n');

  // Check for encryption key
  if (!process.env.TENANT_ENCRYPTION_KEY) {
    console.log('⚠️  TENANT_ENCRYPTION_KEY not set.');
    console.log('   Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    console.log('   Or use this generated key:', generateEncryptionKey());
    console.log('\n   Add it to your .env file and run this script again.\n');
    process.exit(1);
  }

  // Connect to MongoDB
  console.log('📦 Connecting to MongoDB...');
  await mongoose.connect(config.mongodb.uri);
  console.log('✅ Connected to MongoDB\n');

  try {
    // Step 1: Check if default tenant exists
    console.log('🔍 Checking for existing default tenant...');
    let defaultTenant = await TenantModel.findOne({ tenantId: 'tnt_default' });

    if (defaultTenant) {
      console.log('✅ Default tenant already exists:', defaultTenant.tenantId);
    } else {
      // Create default tenant from current env config
      console.log('📝 Creating default tenant from environment config...');

      // Validate required env vars
      if (!config.whatsapp.phoneNumberId || !config.whatsapp.accessToken) {
        console.log('⚠️  WhatsApp config not found in environment.');
        console.log('   Skipping tenant creation. You can create tenants manually via API.');
      } else {
        defaultTenant = await TenantModel.create({
          tenantId: 'tnt_default',
          businessName: config.business.name,
          businessPhone: config.business.phone,
          businessEmail: 'admin@example.com', // Update this
          whatsapp: {
            phoneNumberId: config.whatsapp.phoneNumberId,
            businessAccountId: config.whatsapp.businessAccountId || '',
            accessToken: encryptCredential(config.whatsapp.accessToken),
            verifyToken: config.whatsapp.verifyToken,
            catalogId: config.whatsapp.catalogId,
            apiVersion: 'v18.0',
          },
          razorpay: {
            keyId: encryptCredential(config.razorpay.keyId),
            keySecret: encryptCredential(config.razorpay.keySecret),
            webhookSecret: encryptCredential(config.razorpay.webhookSecret),
          },
          settings: {
            currency: 'INR',
            timezone: 'Asia/Kolkata',
          },
          isActive: true,
        });

        console.log('✅ Default tenant created:', defaultTenant.tenantId);
      }
    }

    // Step 2: Update conversations without tenantId
    if (defaultTenant) {
      console.log('\n📝 Updating conversations...');
      const conversationsResult = await ConversationModel.updateMany(
        { tenantId: { $exists: false } },
        { $set: { tenantId: defaultTenant.tenantId } }
      );
      console.log(`✅ Updated ${conversationsResult.modifiedCount} conversations`);

      // Step 3: Update orders without tenantId
      console.log('\n📝 Updating orders...');
      const ordersResult = await OrderModel.updateMany(
        { tenantId: { $exists: false } },
        { $set: { tenantId: defaultTenant.tenantId } }
      );
      console.log(`✅ Updated ${ordersResult.modifiedCount} orders`);
    }

    // Step 4: Create indexes
    console.log('\n📝 Ensuring indexes...');

    // Drop old unique index on phoneNumber if it exists
    try {
      await ConversationModel.collection.dropIndex('phoneNumber_1');
      console.log('   Dropped old phoneNumber unique index');
    } catch (e) {
      // Index might not exist
    }

    // Create new compound indexes
    await ConversationModel.collection.createIndex(
      { tenantId: 1, phoneNumber: 1 },
      { unique: true }
    );
    console.log('   Created tenantId + phoneNumber compound index on conversations');

    await OrderModel.collection.createIndex(
      { tenantId: 1, orderId: 1 },
      { unique: true }
    );
    console.log('   Created tenantId + orderId compound index on orders');

    console.log('\n✅ Migration completed successfully!\n');

    // Summary
    const tenantCount = await TenantModel.countDocuments();
    const conversationCount = await ConversationModel.countDocuments();
    const orderCount = await OrderModel.countDocuments();

    console.log('📊 Summary:');
    console.log(`   Tenants:       ${tenantCount}`);
    console.log(`   Conversations: ${conversationCount}`);
    console.log(`   Orders:        ${orderCount}`);
    console.log();

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run migration
migrate();
