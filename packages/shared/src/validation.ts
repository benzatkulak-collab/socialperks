export interface ValidationResult { valid: boolean; error?: string; }

export function validateEmail(email: string): ValidationResult {
  if (!email || typeof email !== "string") return { valid: false, error: "Email is required" };
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  return { valid, error: valid ? undefined : "Invalid email address" };
}
export function validatePin(pin: string): ValidationResult {
  if (!pin || typeof pin !== "string") return { valid: false, error: "PIN is required" };
  const valid = /^\d{4,8}$/.test(pin);
  return { valid, error: valid ? undefined : "PIN must be 4-8 digits" };
}
export function validateBusinessName(name: string): ValidationResult {
  if (!name || typeof name !== "string" || !name.trim()) return { valid: false, error: "Business name is required" };
  if (name.trim().length < 2) return { valid: false, error: "Name too short" };
  if (name.trim().length > 100) return { valid: false, error: "Name too long" };
  return { valid: true };
}
export function validateCampaignName(name: string): ValidationResult {
  if (!name || typeof name !== "string" || !name.trim()) return { valid: false, error: "Campaign name is required" };
  if (name.trim().length < 3) return { valid: false, error: "Name too short" };
  return { valid: true };
}
export function validatePerkValue(value: number, type: "pct" | "dol"): ValidationResult {
  if (!Number.isFinite(value) || value <= 0) return { valid: false, error: "Perk value must be a positive number" };
  if (type === "pct" && value > 100) return { valid: false, error: "Percentage cannot exceed 100%" };
  if (type === "dol" && value > 10000) return { valid: false, error: "Dollar value seems too high" };
  return { valid: true };
}
export function validateActions(actions: string[]): ValidationResult {
  if (!actions.length) return { valid: false, error: "At least one action is required" };
  return { valid: true };
}
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  try { new URL(url); return true; } catch { return false; }
}
export function isValidHandle(handle: string): boolean {
  if (!handle || typeof handle !== "string") return false;
  return /^@?[\w.]{1,30}$/.test(handle);
}
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== "string") return "";
  return input.replace(/[<>&"']/g, (c) => {
    const map: Record<string, string> = { "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" };
    return map[c] ?? c;
  });
}
