/**
 * Multi-location management for enterprise businesses.
 * Supports managing campaigns across multiple physical locations.
 */

export interface BusinessLocation {
  id: string;
  businessId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  lat?: number;
  lng?: number;
  timezone: string;
  active: boolean;
  campaignCount: number;
  createdAt: string;
}

// In-memory location store
const locations = new Map<string, BusinessLocation>();

export function createLocation(businessId: string, data: Omit<BusinessLocation, 'id' | 'businessId' | 'campaignCount' | 'createdAt'>): BusinessLocation {
  const loc: BusinessLocation = {
    ...data,
    id: crypto.randomUUID(),
    businessId,
    campaignCount: 0,
    createdAt: new Date().toISOString(),
  };
  locations.set(loc.id, loc);
  return loc;
}

export function getLocations(businessId: string): BusinessLocation[] {
  return Array.from(locations.values()).filter(l => l.businessId === businessId);
}

export function getLocation(id: string): BusinessLocation | null {
  return locations.get(id) || null;
}

export function updateLocation(id: string, updates: Partial<BusinessLocation>): BusinessLocation | null {
  const loc = locations.get(id);
  if (!loc) return null;
  const updated = { ...loc, ...updates, id: loc.id, businessId: loc.businessId };
  locations.set(id, updated);
  return updated;
}

export function deleteLocation(id: string): boolean {
  return locations.delete(id);
}
