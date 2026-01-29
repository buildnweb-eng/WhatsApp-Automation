import { WhatsAppService } from './whatsapp.service';
import { RazorpayService } from './razorpay.service';
import { TenantConfig } from '../domain/types/tenant.types';
import { logger } from '../utils/logger';
import { config } from '../config/env';

interface CacheEntry<T> {
  service: T;
  expiresAt: number;
}

/**
 * Service Factory - Creates and caches tenant-scoped service instances
 * Provides efficient reuse of service instances for the same tenant
 */
class ServiceFactoryImpl {
  private whatsappServices: Map<string, CacheEntry<WhatsAppService>> = new Map();
  private razorpayServices: Map<string, CacheEntry<RazorpayService>> = new Map();
  private readonly cacheTTL = 10 * 60 * 1000; // 10 minutes

  /**
   * Get WhatsApp service for a tenant
   */
  getWhatsAppService(tenantConfig: TenantConfig): WhatsAppService {
    const key = tenantConfig.tenantId;

    // Check cache
    const cached = this.whatsappServices.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.service;
    }

    // Create new service instance
    const service = new WhatsAppService({
      whatsapp: tenantConfig.whatsapp,
      businessPhone: tenantConfig.businessPhone,
    });

    // Cache it
    this.whatsappServices.set(key, {
      service,
      expiresAt: Date.now() + this.cacheTTL,
    });

    logger.debug({ tenantId: key }, 'Created new WhatsApp service instance');
    return service;
  }

  /**
   * Get Razorpay service for a tenant
   */
  getRazorpayService(tenantConfig: TenantConfig): RazorpayService {
    const key = tenantConfig.tenantId;

    // Check cache
    const cached = this.razorpayServices.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.service;
    }

    // Create new service instance
    const service = new RazorpayService({
      razorpay: tenantConfig.razorpay,
      appUrl: config.app.url, // Use platform URL for callbacks
    });

    // Cache it
    this.razorpayServices.set(key, {
      service,
      expiresAt: Date.now() + this.cacheTTL,
    });

    logger.debug({ tenantId: key }, 'Created new Razorpay service instance');
    return service;
  }

  /**
   * Invalidate cached services for a tenant
   * Call this when tenant config is updated
   */
  invalidateTenant(tenantId: string): void {
    this.whatsappServices.delete(tenantId);
    this.razorpayServices.delete(tenantId);
    logger.debug({ tenantId }, 'Invalidated tenant service cache');
  }

  /**
   * Clear all cached services
   */
  clearAll(): void {
    this.whatsappServices.clear();
    this.razorpayServices.clear();
    logger.debug('Cleared all service caches');
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    whatsappServicesCount: number;
    razorpayServicesCount: number;
  } {
    return {
      whatsappServicesCount: this.whatsappServices.size,
      razorpayServicesCount: this.razorpayServices.size,
    };
  }

  /**
   * Clean up expired cache entries
   */
  cleanup(): void {
    const now = Date.now();

    for (const [key, entry] of this.whatsappServices) {
      if (now > entry.expiresAt) {
        this.whatsappServices.delete(key);
      }
    }

    for (const [key, entry] of this.razorpayServices) {
      if (now > entry.expiresAt) {
        this.razorpayServices.delete(key);
      }
    }
  }
}

// Export singleton instance
export const serviceFactory = new ServiceFactoryImpl();

// Run cleanup every 5 minutes
setInterval(() => {
  serviceFactory.cleanup();
}, 5 * 60 * 1000);
