type ValidationResult<T> = { success: true; data: T } | { success: false; error: string };

export function validateEmail(email: unknown): ValidationResult<string> {
  if (typeof email !== 'string') return { success: false, error: 'Email must be a string' };
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length > 254) return { success: false, error: 'Email too long' };
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!re.test(trimmed)) return { success: false, error: 'Invalid email format' };
  return { success: true, data: trimmed };
}

export function validateId(id: unknown): ValidationResult<string> {
  if (typeof id !== 'string') return { success: false, error: 'ID must be a string' };
  if (id.length === 0 || id.length > 100) return { success: false, error: 'ID must be 1-100 characters' };
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return { success: false, error: 'ID contains invalid characters' };
  return { success: true, data: id };
}

export function validateString(value: unknown, field: string, opts: { min?: number; max?: number } = {}): ValidationResult<string> {
  if (typeof value !== 'string') return { success: false, error: `${field} must be a string` };
  const trimmed = value.trim();
  if (opts.min !== undefined && trimmed.length < opts.min) return { success: false, error: `${field} must be at least ${opts.min} characters` };
  if (opts.max !== undefined && trimmed.length > opts.max) return { success: false, error: `${field} must be at most ${opts.max} characters` };
  return { success: true, data: trimmed };
}

export function validateNumber(value: unknown, field: string, opts: { min?: number; max?: number } = {}): ValidationResult<number> {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (typeof num !== 'number' || isNaN(num)) return { success: false, error: `${field} must be a number` };
  if (opts.min !== undefined && num < opts.min) return { success: false, error: `${field} must be at least ${opts.min}` };
  if (opts.max !== undefined && num > opts.max) return { success: false, error: `${field} must be at most ${opts.max}` };
  return { success: true, data: num };
}

export function validateEnum<T extends string>(value: unknown, field: string, values: readonly T[]): ValidationResult<T> {
  if (typeof value !== 'string') return { success: false, error: `${field} must be a string` };
  if (!values.includes(value as T)) return { success: false, error: `${field} must be one of: ${values.join(', ')}` };
  return { success: true, data: value as T };
}
