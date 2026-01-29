import { TenantModel, type TenantDocument } from '@/domain/models/tenant.model';
import { BaseRepository } from './base.repository';
import { nanoid } from 'nanoid';
import { encryptCredential } from '@/utils/encryption';
import { CreateTenantInput, UpdateTenantInput } from '@/domain/types/tenant.types';

/**
 * Tenant Repository
 */
export class TenantRepository extends BaseRepository<TenantDocument> {
  constructor() {
    super(TenantModel);
  }

  /**
   * Generate unique tenant ID
   */
  generateTenantId(): string {
    return `tnt_${nanoid(12)}`;
  }

  /**
   * Create a new tenant with encrypted credentials
   */
  async createTenant(input: CreateTenantInput): Promise<TenantDocument> {
    const tenantId = this.generateTenantId();

    return this.create({
      tenantId,
      businessName: input.businessName,
      businessPhone: input.businessPhone,
      businessEmail: input.businessEmail,
      whatsapp: {
        phoneNumberId: input.whatsapp.phoneNumberId,
        businessAccountId: input.whatsapp.businessAccountId,
        accessToken: encryptCredential(input.whatsapp.accessToken),
        verifyToken: input.whatsapp.verifyToken,
        catalogId: input.whatsapp.catalogId,
        apiVersion: input.whatsapp.apiVersion || 'v18.0',
      },
      razorpay: {
        keyId: encryptCredential(input.razorpay.keyId),
        keySecret: encryptCredential(input.razorpay.keySecret),
        webhookSecret: encryptCredential(input.razorpay.webhookSecret),
      },
      sms: input.sms,
      settings: {
        welcomeMessage: input.settings?.welcomeMessage,
        currency: input.settings?.currency || 'INR',
        timezone: input.settings?.timezone || 'Asia/Kolkata',
      },
      isActive: true,
    } as Partial<TenantDocument>);
  }

  /**
   * Find tenant by tenant ID
   */
  async findByTenantId(tenantId: string): Promise<TenantDocument | null> {
    return this.findOne({ tenantId });
  }

  /**
   * Find tenant by WhatsApp phone number ID
   */
  async findByPhoneNumberId(phoneNumberId: string): Promise<TenantDocument | null> {
    return this.findOne({ 'whatsapp.phoneNumberId': phoneNumberId });
  }

  /**
   * Find tenant by business email
   */
  async findByEmail(email: string): Promise<TenantDocument | null> {
    return this.findOne({ businessEmail: email });
  }

  /**
   * Update tenant configuration
   */
  async updateTenant(tenantId: string, input: UpdateTenantInput): Promise<TenantDocument | null> {
    const updateData: Record<string, unknown> = {};

    if (input.businessName) updateData.businessName = input.businessName;
    if (input.businessPhone) updateData.businessPhone = input.businessPhone;
    if (input.businessEmail) updateData.businessEmail = input.businessEmail;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    // Update WhatsApp config
    if (input.whatsapp) {
      if (input.whatsapp.phoneNumberId) updateData['whatsapp.phoneNumberId'] = input.whatsapp.phoneNumberId;
      if (input.whatsapp.businessAccountId) updateData['whatsapp.businessAccountId'] = input.whatsapp.businessAccountId;
      if (input.whatsapp.accessToken) updateData['whatsapp.accessToken'] = encryptCredential(input.whatsapp.accessToken);
      if (input.whatsapp.verifyToken) updateData['whatsapp.verifyToken'] = input.whatsapp.verifyToken;
      if (input.whatsapp.catalogId) updateData['whatsapp.catalogId'] = input.whatsapp.catalogId;
      if (input.whatsapp.apiVersion) updateData['whatsapp.apiVersion'] = input.whatsapp.apiVersion;
    }

    // Update Razorpay config
    if (input.razorpay) {
      if (input.razorpay.keyId) updateData['razorpay.keyId'] = encryptCredential(input.razorpay.keyId);
      if (input.razorpay.keySecret) updateData['razorpay.keySecret'] = encryptCredential(input.razorpay.keySecret);
      if (input.razorpay.webhookSecret) updateData['razorpay.webhookSecret'] = encryptCredential(input.razorpay.webhookSecret);
    }

    // Update SMS config
    if (input.sms) {
      updateData.sms = input.sms;
    }

    // Update settings
    if (input.settings) {
      if (input.settings.welcomeMessage !== undefined) updateData['settings.welcomeMessage'] = input.settings.welcomeMessage;
      if (input.settings.currency) updateData['settings.currency'] = input.settings.currency;
      if (input.settings.timezone) updateData['settings.timezone'] = input.settings.timezone;
    }

    updateData.updatedAt = new Date();

    return this.update({ tenantId }, updateData);
  }

  /**
   * Deactivate tenant
   */
  async deactivateTenant(tenantId: string): Promise<TenantDocument | null> {
    return this.update({ tenantId }, { isActive: false, updatedAt: new Date() });
  }

  /**
   * Activate tenant
   */
  async activateTenant(tenantId: string): Promise<TenantDocument | null> {
    return this.update({ tenantId }, { isActive: true, updatedAt: new Date() });
  }

  /**
   * List all tenants (for admin)
   */
  async listTenants(options?: {
    limit?: number;
    skip?: number;
    isActive?: boolean;
  }): Promise<TenantDocument[]> {
    const filter: Record<string, unknown> = {};
    if (options?.isActive !== undefined) {
      filter.isActive = options.isActive;
    }
    return this.find(filter, {
      sort: { createdAt: -1 },
      limit: options?.limit || 50,
      skip: options?.skip || 0,
    });
  }

  /**
   * Count tenants
   */
  async countTenants(isActive?: boolean): Promise<number> {
    const filter: Record<string, unknown> = {};
    if (isActive !== undefined) {
      filter.isActive = isActive;
    }
    return this.count(filter);
  }

  /**
   * Check if phone number ID is already registered
   */
  async isPhoneNumberIdRegistered(phoneNumberId: string): Promise<boolean> {
    const tenant = await this.findByPhoneNumberId(phoneNumberId);
    return tenant !== null;
  }
}

// Singleton instance
export const tenantRepository = new TenantRepository();
