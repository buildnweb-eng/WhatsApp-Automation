/**
 * Location-related type definitions
 */

/**
 * WhatsApp Location Message payload
 */
export interface WhatsAppLocationMessage {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

/**
 * Geocoding result from reverse geocoding
 */
export interface GeocodingResult {
  formattedAddress: string;
  streetAddress?: string;
  locality?: string; // City/Town
  adminArea?: string; // State/Province
  postalCode?: string;
  country?: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Pending address awaiting user confirmation
 */
export interface PendingAddress {
  text: string;
  source: 'location' | 'text';
  location?: {
    latitude: number;
    longitude: number;
  };
}
