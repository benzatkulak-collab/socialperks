// =============================================================================
// PII Field Definitions Per Entity Type
// =============================================================================
// These constants define which fields contain Personally Identifiable Information
// and must be encrypted at rest. Used by encryptPII/decryptPII to automatically
// handle encryption for each entity type.
// =============================================================================

export const PII_FIELDS = {
  user: ["email", "name", "phone"],
  business: ["email", "phone", "address"],
  influencer: ["email", "phone", "paymentDetails"],
  submission: ["submitterEmail"],
} as const;

export type PiiEntityType = keyof typeof PII_FIELDS;

/**
 * Get the PII field names for a given entity type.
 */
export function getPiiFields(entityType: PiiEntityType): readonly string[] {
  return PII_FIELDS[entityType];
}
