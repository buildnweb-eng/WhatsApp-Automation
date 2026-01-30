/**
 * Geocoding Service
 * Reverse geocoding using OpenStreetMap Nominatim (free)
 */

import axios from 'axios';
import { logger } from '@/utils/logger';
import type { GeocodingResult } from '@/domain/types/location.types';

export class GeocodingService {
  private lastRequestTime = 0;
  private readonly minRequestInterval = 1000; // 1 second (Nominatim rate limit)

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<GeocodingResult | null> {
    try {
      // Rate limiting for Nominatim
      await this.throttle();

      const url = 'https://nominatim.openstreetmap.org/reverse';

      const response = await axios.get(url, {
        params: {
          lat: latitude,
          lon: longitude,
          format: 'json',
          addressdetails: 1,
        },
        headers: {
          'User-Agent': 'WhatsAppCatalogAutomation/1.0', // Required by Nominatim
          'Accept-Language': 'en',
        },
        timeout: 5000,
      });

      const data = response.data;

      if (!data || data.error) {
        logger.warn({ latitude, longitude, error: data?.error }, 'Nominatim returned error');
        return null;
      }

      const addr = data.address || {};

      const result: GeocodingResult = {
        formattedAddress: data.display_name,
        streetAddress: [addr.house_number, addr.road].filter(Boolean).join(' ') || undefined,
        locality: addr.city || addr.town || addr.village || addr.suburb || addr.county,
        adminArea: addr.state || addr.state_district,
        postalCode: addr.postcode,
        country: addr.country,
        confidence: this.assessConfidence(addr),
      };

      logger.info(
        { latitude, longitude, confidence: result.confidence },
        '📍 Reverse geocoding successful'
      );

      return result;
    } catch (error) {
      logger.error({ error, latitude, longitude }, '❌ Geocoding failed');
      return null;
    }
  }

  /**
   * Assess confidence of geocoding result
   */
  private assessConfidence(
    addr: Record<string, string>
  ): 'high' | 'medium' | 'low' {
    const hasStreet = !!(addr.road || addr.street);
    const hasCity = !!(addr.city || addr.town || addr.village);
    const hasPostcode = !!addr.postcode;

    if (hasStreet && hasCity && hasPostcode) return 'high';
    if (hasCity && (hasStreet || hasPostcode)) return 'medium';
    return 'low';
  }

  /**
   * Format address for delivery (India-specific)
   */
  formatDeliveryAddress(result: GeocodingResult): string {
    const parts: string[] = [];

    if (result.streetAddress) parts.push(result.streetAddress);
    if (result.locality) parts.push(result.locality);
    if (result.adminArea) parts.push(result.adminArea);
    if (result.postalCode) parts.push(`PIN: ${result.postalCode}`);
    if (result.country && result.country !== 'India') parts.push(result.country);

    return parts.join(', ') || result.formattedAddress;
  }

  /**
   * Throttle requests to respect Nominatim rate limits
   */
  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;

    if (elapsed < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - elapsed;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }
}

// Singleton instance
export const geocodingService = new GeocodingService();
