import { Elysia, t } from 'elysia';
import { logger } from '@/utils/logger';
import { tenantRepository } from '@/repositories/tenant.repository';
import { conversationRepository, orderRepository } from '@/repositories';
import { tenantResolver } from '@/services/tenant-resolver.service';
import { serviceFactory } from '@/services/service-factory';
import { CreateTenantInput, UpdateTenantInput } from '@/domain/types/tenant.types';

/**
 * Tenant Management API Routes
 * Note: In production, protect these endpoints with authentication
 */
export const tenantRoutes = new Elysia({ prefix: '/api/tenants' })
  /**
   * Create a new tenant
   */
  .post(
    '/',
    async ({ body }) => {
      try {
        const input = body as CreateTenantInput;

        // Check if phone number ID is already registered
        const existing = await tenantRepository.findByPhoneNumberId(input.whatsapp.phoneNumberId);
        if (existing) {
          return new Response(
            JSON.stringify({ error: 'Phone number ID already registered' }),
            { status: 400 }
          );
        }

        const tenant = await tenantRepository.createTenant(input);

        logger.info({ tenantId: tenant.tenantId }, '✅ Tenant created');

        return {
          success: true,
          tenant: {
            tenantId: tenant.tenantId,
            businessName: tenant.businessName,
            businessEmail: tenant.businessEmail,
            isActive: tenant.isActive,
            createdAt: tenant.createdAt,
          },
        };
      } catch (error) {
        logger.error({ error }, '❌ Failed to create tenant');
        return new Response(
          JSON.stringify({ error: 'Failed to create tenant' }),
          { status: 500 }
        );
      }
    },
    {
      body: t.Object({
        businessName: t.String(),
        businessPhone: t.String(),
        businessEmail: t.String(),
        whatsapp: t.Object({
          phoneNumberId: t.String(),
          businessAccountId: t.String(),
          accessToken: t.String(),
          verifyToken: t.String(),
          catalogId: t.String(),
          apiVersion: t.Optional(t.String()),
        }),
        razorpay: t.Object({
          keyId: t.String(),
          keySecret: t.String(),
          webhookSecret: t.String(),
        }),
        sms: t.Optional(t.Any()),
        settings: t.Optional(t.Object({
          welcomeMessage: t.Optional(t.String()),
          currency: t.Optional(t.String()),
          timezone: t.Optional(t.String()),
        })),
      }),
    }
  )

  /**
   * List all tenants
   */
  .get('/', async ({ query }) => {
    try {
      const limit = query.limit ? parseInt(query.limit) : 50;
      const skip = query.skip ? parseInt(query.skip) : 0;
      const isActive = query.isActive === 'true' ? true : query.isActive === 'false' ? false : undefined;

      const tenants = await tenantRepository.listTenants({ limit, skip, isActive });
      const total = await tenantRepository.countTenants(isActive);

      return {
        tenants: tenants.map(t => ({
          tenantId: t.tenantId,
          businessName: t.businessName,
          businessPhone: t.businessPhone,
          businessEmail: t.businessEmail,
          whatsapp: {
            phoneNumberId: t.whatsapp.phoneNumberId,
            catalogId: t.whatsapp.catalogId,
          },
          isActive: t.isActive,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        })),
        pagination: {
          total,
          limit,
          skip,
        },
      };
    } catch (error) {
      logger.error({ error }, '❌ Failed to list tenants');
      return new Response(
        JSON.stringify({ error: 'Failed to list tenants' }),
        { status: 500 }
      );
    }
  })

  /**
   * Get tenant by ID
   */
  .get('/:tenantId', async ({ params }) => {
    try {
      const tenant = await tenantRepository.findByTenantId(params.tenantId);

      if (!tenant) {
        return new Response(
          JSON.stringify({ error: 'Tenant not found' }),
          { status: 404 }
        );
      }

      return {
        tenant: {
          tenantId: tenant.tenantId,
          businessName: tenant.businessName,
          businessPhone: tenant.businessPhone,
          businessEmail: tenant.businessEmail,
          whatsapp: {
            phoneNumberId: tenant.whatsapp.phoneNumberId,
            businessAccountId: tenant.whatsapp.businessAccountId,
            catalogId: tenant.whatsapp.catalogId,
            apiVersion: tenant.whatsapp.apiVersion,
            // Don't expose accessToken
          },
          razorpay: {
            // Only expose that it's configured, not the keys
            isConfigured: !!tenant.razorpay.keyId,
          },
          settings: tenant.settings,
          isActive: tenant.isActive,
          createdAt: tenant.createdAt,
          updatedAt: tenant.updatedAt,
        },
      };
    } catch (error) {
      logger.error({ error, tenantId: params.tenantId }, '❌ Failed to get tenant');
      return new Response(
        JSON.stringify({ error: 'Failed to get tenant' }),
        { status: 500 }
      );
    }
  })

  /**
   * Update tenant
   */
  .put(
    '/:tenantId',
    async ({ params, body }) => {
      try {
        const input = body as UpdateTenantInput;

        const tenant = await tenantRepository.updateTenant(params.tenantId, input);

        if (!tenant) {
          return new Response(
            JSON.stringify({ error: 'Tenant not found' }),
            { status: 404 }
          );
        }

        // Invalidate cache
        tenantResolver.invalidateCache(params.tenantId, tenant.whatsapp.phoneNumberId);
        serviceFactory.invalidateTenant(params.tenantId);

        logger.info({ tenantId: params.tenantId }, '✅ Tenant updated');

        return {
          success: true,
          tenant: {
            tenantId: tenant.tenantId,
            businessName: tenant.businessName,
            isActive: tenant.isActive,
            updatedAt: tenant.updatedAt,
          },
        };
      } catch (error) {
        logger.error({ error, tenantId: params.tenantId }, '❌ Failed to update tenant');
        return new Response(
          JSON.stringify({ error: 'Failed to update tenant' }),
          { status: 500 }
        );
      }
    },
    {
      body: t.Object({
        businessName: t.Optional(t.String()),
        businessPhone: t.Optional(t.String()),
        businessEmail: t.Optional(t.String()),
        whatsapp: t.Optional(t.Object({
          phoneNumberId: t.Optional(t.String()),
          businessAccountId: t.Optional(t.String()),
          accessToken: t.Optional(t.String()),
          verifyToken: t.Optional(t.String()),
          catalogId: t.Optional(t.String()),
          apiVersion: t.Optional(t.String()),
        })),
        razorpay: t.Optional(t.Object({
          keyId: t.Optional(t.String()),
          keySecret: t.Optional(t.String()),
          webhookSecret: t.Optional(t.String()),
        })),
        settings: t.Optional(t.Object({
          welcomeMessage: t.Optional(t.String()),
          currency: t.Optional(t.String()),
          timezone: t.Optional(t.String()),
        })),
        isActive: t.Optional(t.Boolean()),
      }),
    }
  )

  /**
   * Deactivate tenant
   */
  .delete('/:tenantId', async ({ params }) => {
    try {
      const tenant = await tenantRepository.deactivateTenant(params.tenantId);

      if (!tenant) {
        return new Response(
          JSON.stringify({ error: 'Tenant not found' }),
          { status: 404 }
        );
      }

      // Invalidate cache
      tenantResolver.invalidateCache(params.tenantId, tenant.whatsapp.phoneNumberId);
      serviceFactory.invalidateTenant(params.tenantId);

      logger.info({ tenantId: params.tenantId }, '✅ Tenant deactivated');

      return { success: true, message: 'Tenant deactivated' };
    } catch (error) {
      logger.error({ error, tenantId: params.tenantId }, '❌ Failed to deactivate tenant');
      return new Response(
        JSON.stringify({ error: 'Failed to deactivate tenant' }),
        { status: 500 }
      );
    }
  })

  /**
   * Test WhatsApp connection for a tenant
   */
  .post('/:tenantId/test-whatsapp', async ({ params, body }) => {
    try {
      const tenantConfig = await tenantResolver.resolveByTenantId(params.tenantId);

      if (!tenantConfig) {
        return new Response(
          JSON.stringify({ error: 'Tenant not found' }),
          { status: 404 }
        );
      }

      const testPhone = (body as { phone?: string })?.phone;
      if (!testPhone) {
        return new Response(
          JSON.stringify({ error: 'Phone number required' }),
          { status: 400 }
        );
      }

      const whatsappService = serviceFactory.getWhatsAppService(tenantConfig);

      await whatsappService.sendTextMessage(
        testPhone,
        `🧪 Test message from ${tenantConfig.businessName}.\n\nYour WhatsApp integration is working correctly!`
      );

      return { success: true, message: 'Test message sent' };
    } catch (error) {
      logger.error({ error, tenantId: params.tenantId }, '❌ WhatsApp test failed');
      return new Response(
        JSON.stringify({ error: 'WhatsApp test failed', details: String(error) }),
        { status: 500 }
      );
    }
  })

  /**
   * Get tenant's orders
   */
  .get('/:tenantId/orders', async ({ params, query }) => {
    try {
      const limit = query.limit ? parseInt(query.limit) : 50;
      const skip = query.skip ? parseInt(query.skip) : 0;

      const orders = await orderRepository.findByTenant(params.tenantId, { limit, skip });
      const stats = await orderRepository.getOrderStats(params.tenantId);

      return {
        orders: orders.map(o => ({
          orderId: o.orderId,
          phoneNumber: o.phoneNumber,
          customerName: o.customerName,
          totalAmount: o.totalAmount,
          status: o.status,
          paymentStatus: o.payment.status,
          createdAt: o.createdAt,
        })),
        stats,
        pagination: { limit, skip },
      };
    } catch (error) {
      logger.error({ error, tenantId: params.tenantId }, '❌ Failed to get orders');
      return new Response(
        JSON.stringify({ error: 'Failed to get orders' }),
        { status: 500 }
      );
    }
  })

  /**
   * Get tenant's conversations
   */
  .get('/:tenantId/conversations', async ({ params, query }) => {
    try {
      const limit = query.limit ? parseInt(query.limit) : 50;
      const skip = query.skip ? parseInt(query.skip) : 0;

      const conversations = await conversationRepository.findByTenant(params.tenantId, { limit, skip });
      const stats = await conversationRepository.getConversationStats(params.tenantId);

      return {
        conversations: conversations.map(c => ({
          phoneNumber: c.phoneNumber,
          customerName: c.customerName,
          state: c.state,
          lastMessageAt: c.lastMessageAt,
          hasCart: !!c.cart,
        })),
        stats,
        pagination: { limit, skip },
      };
    } catch (error) {
      logger.error({ error, tenantId: params.tenantId }, '❌ Failed to get conversations');
      return new Response(
        JSON.stringify({ error: 'Failed to get conversations' }),
        { status: 500 }
      );
    }
  })

  /**
   * Get tenant statistics
   */
  .get('/:tenantId/stats', async ({ params }) => {
    try {
      const orderStats = await orderRepository.getOrderStats(params.tenantId);
      const conversationStats = await conversationRepository.getConversationStats(params.tenantId);

      return {
        orders: orderStats,
        conversations: conversationStats,
      };
    } catch (error) {
      logger.error({ error, tenantId: params.tenantId }, '❌ Failed to get stats');
      return new Response(
        JSON.stringify({ error: 'Failed to get stats' }),
        { status: 500 }
      );
    }
  });
