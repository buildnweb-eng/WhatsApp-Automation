import { Elysia } from 'elysia';
import mongoose from 'mongoose';
import { conversationRepository, orderRepository } from '@/repositories';

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
   * Stats endpoint (for monitoring dashboards)
   */
  .get('/stats', async () => {
    try {
      const [conversationStats, orderStats] = await Promise.all([
        conversationRepository.getConversationStats(),
        orderRepository.getOrderStats(),
      ]);

      return {
        timestamp: new Date().toISOString(),
        conversations: conversationStats,
        orders: orderStats,
      };
    } catch (error) {
      return {
        error: 'Failed to fetch stats',
        timestamp: new Date().toISOString(),
      };
    }
  });

