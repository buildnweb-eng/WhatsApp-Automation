import { Elysia } from 'elysia';
import mongoose from 'mongoose';
import { ConversationModel } from '@/domain/models/conversation.model';
import { OrderModel } from '@/domain/models/order.model';
import { TenantModel } from '@/domain/models/tenant.model';

/**
 * Health Check Routes
 */
export const healthRoutes = new Elysia()
  /**
   * Basic health check
   */
  .get('/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }))

  /**
   * Detailed health check with dependencies
   */
  .get('/health/detailed', async () => {
    const mongoState = mongoose.connection.readyState;
    const mongoStates: Record<number, string> = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    return {
      status: mongoState === 1 ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      dependencies: {
        mongodb: {
          status: mongoStates[mongoState] || 'unknown',
          connected: mongoState === 1,
        },
      },
    };
  })

  /**
   * Platform-wide stats endpoint (for monitoring dashboards)
   */
  .get('/stats', async () => {
    try {
      const [
        tenantCount,
        activeTenantCount,
        conversationCount,
        orderCount,
      ] = await Promise.all([
        TenantModel.countDocuments(),
        TenantModel.countDocuments({ isActive: true }),
        ConversationModel.countDocuments(),
        OrderModel.countDocuments(),
      ]);

      // Get order stats by status
      const orderStats = await OrderModel.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);

      const ordersByStatus: Record<string, number> = {};
      orderStats.forEach(({ _id, count }) => {
        ordersByStatus[_id] = count;
      });

      // Get conversation stats by state
      const conversationStats = await ConversationModel.aggregate([
        {
          $group: {
            _id: '$state',
            count: { $sum: 1 },
          },
        },
      ]);

      const conversationsByState: Record<string, number> = {};
      conversationStats.forEach(({ _id, count }) => {
        conversationsByState[_id] = count;
      });

      return {
        timestamp: new Date().toISOString(),
        tenants: {
          total: tenantCount,
          active: activeTenantCount,
        },
        conversations: {
          total: conversationCount,
          byState: conversationsByState,
        },
        orders: {
          total: orderCount,
          byStatus: ordersByStatus,
        },
      };
    } catch (error) {
      return {
        error: 'Failed to fetch stats',
        timestamp: new Date().toISOString(),
      };
    }
  });
