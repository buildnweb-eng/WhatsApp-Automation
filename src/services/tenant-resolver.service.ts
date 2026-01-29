import { TenantModel, TenantDocument } from '../domain/models/tenant.model';
import { TenantConfig } from '../domain/types/tenant.types';
import { decryptCredential } from '../utils/encryption';
import { logger } from '../utils/logger';

interface CacheEntry {
  config: TenantConfig;
  expiresAt: number;
}

/**
 * Service for resolving tenant configuration from phoneNumberId
 * Uses in-memory cache with TTL for performance
 */
class TenantResolverService {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly cacheTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Resolve tenant by WhatsApp phone number ID (used in webhook routing)
   */
  async resolveByPhoneNumberId(phoneNumberId: string): Promise<TenantConfig | null> {
    const cacheKey = `phone:${phoneNumberId}`;

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      logger.debug({ phoneNumberId }, 'Tenant resolved from cache');
      return cached;
    }

    // Query database
    const tenant = await TenantModel.findOne({
      'whatsapp.phoneNumberId': phoneNumberId,
      isActive: true,
    }).lean();

    if (!tenant) {
      logger.warn({ phoneNumberId }, 'Tenant not found for phone number ID');
      return null;
    }

    // Build config with decrypted credentials
    const config = this.buildTenantConfig(tenant as unknown as TenantDocument);

    // Cache it
    this.setCache(cacheKey, config);

    // Also cache by tenantId for quick lookups
    this.setCache(`tenant:${config.tenantId}`, config);

    logger.debug({ tenantId: config.tenantId, phoneNumberId }, 'Tenant resolved from database');
    return config;
  }

  /**
   * Resolve tenant by tenant ID
   */
  async resolveByTenantId(tenantId: string): Promise<TenantConfig | null> {
    const cacheKey = `tenant:${tenantId}`;

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Query database
    const tenant = await TenantModel.findOne({
      tenantId,
      isActive: true,
    }).lean();

    if (!tenant) {
      logger.warn({ tenantId }, 'Tenant not found');
      return null;
    }

    // Build config with decrypted credentials
    const config = this.buildTenantConfig(tenant as unknown as TenantDocument);

    // Cache it
    this.setCache(cacheKey, config);
    this.setCache(`phone:${config.whatsapp.phoneNumberId}`, config);

    return config;
  }

  /**
   * Invalidate cache for a tenant (call when tenant config is updated)
   */
  invalidateCache(tenantId: string, phoneNumberId?: string): void {
    this.cache.delete(`tenant:${tenantId}`);
    if (phoneNumberId) {
      this.cache.delete(`phone:${phoneNumberId}`);
    }
    logger.debug({ tenantId }, 'Tenant cache invalidated');
  }

  /**
   * Clear entire cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.debug('Tenant cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  private getFromCache(key: string): TenantConfig | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.config;
  }

  private setCache(key: string, config: TenantConfig): void {
    this.cache.set(key, {
      config,
      expiresAt: Date.now() + this.cacheTTL,
    });
  }

  /**
   * Build runtime config with decrypted credentials
   */
  private buildTenantConfig(tenant: TenantDocument): TenantConfig {
    return {
      tenantId: tenant.tenantId,
      businessName: tenant.businessName,
      businessPhone: tenant.businessPhone,
      businessEmail: tenant.businessEmail,
      whatsapp: {
        apiUrl: `https://graph.facebook.com/${tenant.whatsapp.apiVersion}`,
        phoneNumberId: tenant.whatsapp.phoneNumberId,
        businessAccountId: tenant.whatsapp.businessAccountId,
        accessToken: decryptCredential(tenant.whatsapp.accessToken),
        verifyToken: tenant.whatsapp.verifyToken,
        catalogId: tenant.whatsapp.catalogId,
        apiVersion: tenant.whatsapp.apiVersion,
      },
      razorpay: {
        keyId: decryptCredential(tenant.razorpay.keyId),
        keySecret: decryptCredential(tenant.razorpay.keySecret),
        webhookSecret: decryptCredential(tenant.razorpay.webhookSecret),
      },
      sms: tenant.sms ? {
        provider: tenant.sms.provider,
        msg91: tenant.sms.msg91 ? {
          apiKey: decryptCredential(tenant.sms.msg91.apiKey),
          senderId: tenant.sms.msg91.senderId,
          flowId: tenant.sms.msg91.flowId,
        } : undefined,
        twilio: tenant.sms.twilio ? {
          accountSid: decryptCredential(tenant.sms.twilio.accountSid),
          authToken: decryptCredential(tenant.sms.twilio.authToken),
          phoneNumber: tenant.sms.twilio.phoneNumber,
        } : undefined,
      } : undefined,
      settings: {
        welcomeMessage: tenant.settings.welcomeMessage,
        currency: tenant.settings.currency,
        timezone: tenant.settings.timezone,
      },
    };
  }
}

// Export singleton instance
export const tenantResolver = new TenantResolverService();
