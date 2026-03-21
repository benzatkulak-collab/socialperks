// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — SOC 2 Type II Compliance Infrastructure
// Data classification, RBAC, audit logging, encryption, and retention
// enforcement for enterprise-grade security compliance.
// ══════════════════════════════════════════════════════════════════════════════

// ─── Data Classification Types ──────────────────────────────────────────────

export type DataClassification = "public" | "internal" | "confidential" | "restricted";

export type PIIType =
  | "none"
  | "email"
  | "name"
  | "phone"
  | "address"
  | "ssn"
  | "financial"
  | "health";

export type MaskingRule = "none" | "partial" | "full" | "hash";

export interface DataField {
  table: string;
  column: string;
  classification: DataClassification;
  piiType: PIIType;
  encryptionRequired: boolean;
  retentionDays: number;
  maskingRule: MaskingRule;
}

export interface ClassificationPolicy {
  classification: DataClassification;
  encryptionRequired: boolean;
  accessLogging: boolean;
  retentionMinDays: number;
  retentionMaxDays: number;
  exportRestricted: boolean;
  mfaRequired: boolean;
  description: string;
}

// ─── RBAC Types ─────────────────────────────────────────────────────────────

export type Permission =
  | "campaigns:create"
  | "campaigns:read"
  | "campaigns:update"
  | "campaigns:delete"
  | "submissions:create"
  | "submissions:read"
  | "submissions:review"
  | "users:create"
  | "users:read"
  | "users:update"
  | "users:delete"
  | "billing:read"
  | "billing:manage"
  | "analytics:read"
  | "analytics:export"
  | "settings:read"
  | "settings:manage"
  | "api_keys:create"
  | "api_keys:revoke"
  | "admin:all";

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  inherits: string[]; // Role IDs to inherit from
}

export interface UserRoleAssignment {
  userId: string;
  roleIds: string[];
  assignedAt: string;
  assignedBy: string;
}

// ─── Audit Log Types ────────────────────────────────────────────────────────

export type AuditEventType =
  | "data_access"
  | "data_change"
  | "auth_login"
  | "auth_logout"
  | "auth_failed"
  | "auth_mfa"
  | "admin_role_change"
  | "admin_config_change"
  | "admin_user_action"
  | "data_export"
  | "data_deletion"
  | "key_rotation"
  | "policy_change";

export interface AuditEntry {
  id: string;
  timestamp: string;
  type: AuditEventType;
  actorId: string;
  actorType: "user" | "system" | "api_key" | "service";
  resource: string; // e.g., "users.email", "campaigns.123"
  action: string; // human-readable description
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  previousHash: string; // hash of previous entry (tamper-evidence chain)
  entryHash: string; // hash of this entry
}

export interface AuditQueryFilters {
  type?: AuditEventType;
  actorId?: string;
  resource?: string;
  after?: string;
  before?: string;
  limit?: number;
  offset?: number;
}

// ─── Encryption Types ───────────────────────────────────────────────────────

export interface KeyMetadata {
  keyId: string;
  version: number;
  algorithm: string;
  createdAt: string;
  rotatedAt: string | null;
  expiresAt: string | null;
  status: "active" | "rotated" | "expired" | "revoked";
}

export interface EncryptedPayload {
  ciphertext: string;
  keyId: string;
  keyVersion: number;
  iv: string;
  tag: string;
  algorithm: string;
}

// ─── Retention Types ────────────────────────────────────────────────────────

export interface RetentionRecord {
  table: string;
  recordId: string;
  classification: DataClassification;
  createdAt: string;
  retentionDays: number;
  expiresAt: string;
  legalHold: boolean;
  legalHoldReason: string | null;
  purgedAt: string | null;
}

export interface RetentionReport {
  totalRecords: number;
  expiredRecords: number;
  heldRecords: number;
  purgedRecords: number;
  byClassification: Record<
    DataClassification,
    { total: number; expired: number; held: number; purged: number }
  >;
  byTable: Record<
    string,
    { total: number; expired: number; held: number; purged: number }
  >;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

/**
 * SHA-256 hash for tamper-evidence chain and data masking.
 */
function simpleHash(input: string): string {
  const nodeCrypto = require("crypto") as typeof import("crypto");
  return nodeCrypto.createHash("sha256").update(input).digest("hex").slice(0, 16);
}

/**
 * AES-256-GCM encryption via Node.js crypto.
 */
function xorEncrypt(plaintext: string, key: string): { ciphertext: string; iv: string; tag: string } {
  const nodeCrypto = require("crypto") as typeof import("crypto");
  // Derive a 32-byte key from the variable-length key material
  const derivedKey = nodeCrypto.createHash("sha256").update(key).digest();
  const iv = nodeCrypto.randomBytes(12);
  const cipher = nodeCrypto.createCipheriv("aes-256-gcm", derivedKey, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

function xorDecrypt(ciphertext: string, key: string, iv: string, tag?: string): string {
  const nodeCrypto = require("crypto") as typeof import("crypto");
  const derivedKey = nodeCrypto.createHash("sha256").update(key).digest();
  const decipher = nodeCrypto.createDecipheriv(
    "aes-256-gcm",
    derivedKey,
    Buffer.from(iv, "base64")
  );
  if (tag) {
    decipher.setAuthTag(Buffer.from(tag, "base64"));
  }
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

// ══════════════════════════════════════════════════════════════════════════════
// Data Classifier
// ══════════════════════════════════════════════════════════════════════════════

export class DataClassifier {
  private fields = new Map<string, DataField>(); // key: `${table}.${column}`
  private policies = new Map<DataClassification, ClassificationPolicy>();

  constructor() {
    this.initializePolicies();
    this.initializeDefaultFields();
  }

  // ─── Policy Initialization ──────────────────────────────────────────────

  private initializePolicies(): void {
    this.policies.set("public", {
      classification: "public",
      encryptionRequired: false,
      accessLogging: false,
      retentionMinDays: 0,
      retentionMaxDays: 3650, // 10 years
      exportRestricted: false,
      mfaRequired: false,
      description: "Publicly available data. No special handling required.",
    });

    this.policies.set("internal", {
      classification: "internal",
      encryptionRequired: false,
      accessLogging: true,
      retentionMinDays: 30,
      retentionMaxDays: 2555, // 7 years
      exportRestricted: false,
      mfaRequired: false,
      description: "Internal business data. Access logging required.",
    });

    this.policies.set("confidential", {
      classification: "confidential",
      encryptionRequired: true,
      accessLogging: true,
      retentionMinDays: 90,
      retentionMaxDays: 1825, // 5 years
      exportRestricted: true,
      mfaRequired: true,
      description: "Confidential data. Encryption and MFA required.",
    });

    this.policies.set("restricted", {
      classification: "restricted",
      encryptionRequired: true,
      accessLogging: true,
      retentionMinDays: 365,
      retentionMaxDays: 2555, // 7 years
      exportRestricted: true,
      mfaRequired: true,
      description: "Restricted data (PII, financial). Maximum protection required.",
    });
  }

  // ─── Default Social Perks Schema Classification ─────────────────────────

  private initializeDefaultFields(): void {
    const defaults: DataField[] = [
      // Users table
      { table: "users", column: "id", classification: "internal", piiType: "none", encryptionRequired: false, retentionDays: 2555, maskingRule: "none" },
      { table: "users", column: "email", classification: "restricted", piiType: "email", encryptionRequired: true, retentionDays: 2555, maskingRule: "partial" },
      { table: "users", column: "name", classification: "confidential", piiType: "name", encryptionRequired: true, retentionDays: 2555, maskingRule: "partial" },
      { table: "users", column: "password_hash", classification: "restricted", piiType: "none", encryptionRequired: true, retentionDays: 2555, maskingRule: "full" },
      { table: "users", column: "role", classification: "internal", piiType: "none", encryptionRequired: false, retentionDays: 2555, maskingRule: "none" },
      { table: "users", column: "phone", classification: "restricted", piiType: "phone", encryptionRequired: true, retentionDays: 2555, maskingRule: "partial" },
      { table: "users", column: "created_at", classification: "internal", piiType: "none", encryptionRequired: false, retentionDays: 2555, maskingRule: "none" },

      // Businesses table
      { table: "businesses", column: "id", classification: "internal", piiType: "none", encryptionRequired: false, retentionDays: 2555, maskingRule: "none" },
      { table: "businesses", column: "name", classification: "public", piiType: "none", encryptionRequired: false, retentionDays: 2555, maskingRule: "none" },
      { table: "businesses", column: "type", classification: "public", piiType: "none", encryptionRequired: false, retentionDays: 2555, maskingRule: "none" },
      { table: "businesses", column: "address", classification: "confidential", piiType: "address", encryptionRequired: true, retentionDays: 2555, maskingRule: "partial" },
      { table: "businesses", column: "tax_id", classification: "restricted", piiType: "financial", encryptionRequired: true, retentionDays: 2555, maskingRule: "full" },

      // Campaigns table
      { table: "campaigns", column: "id", classification: "internal", piiType: "none", encryptionRequired: false, retentionDays: 1825, maskingRule: "none" },
      { table: "campaigns", column: "name", classification: "public", piiType: "none", encryptionRequired: false, retentionDays: 1825, maskingRule: "none" },
      { table: "campaigns", column: "business_id", classification: "internal", piiType: "none", encryptionRequired: false, retentionDays: 1825, maskingRule: "none" },
      { table: "campaigns", column: "discount_value", classification: "internal", piiType: "none", encryptionRequired: false, retentionDays: 1825, maskingRule: "none" },
      { table: "campaigns", column: "status", classification: "internal", piiType: "none", encryptionRequired: false, retentionDays: 1825, maskingRule: "none" },

      // Submissions table
      { table: "submissions", column: "id", classification: "internal", piiType: "none", encryptionRequired: false, retentionDays: 1825, maskingRule: "none" },
      { table: "submissions", column: "user_id", classification: "internal", piiType: "none", encryptionRequired: false, retentionDays: 1825, maskingRule: "none" },
      { table: "submissions", column: "proof_url", classification: "confidential", piiType: "none", encryptionRequired: false, retentionDays: 1825, maskingRule: "none" },
      { table: "submissions", column: "content", classification: "confidential", piiType: "none", encryptionRequired: false, retentionDays: 1825, maskingRule: "none" },

      // Perks / Wallet table
      { table: "perks", column: "id", classification: "internal", piiType: "none", encryptionRequired: false, retentionDays: 1095, maskingRule: "none" },
      { table: "perks", column: "user_id", classification: "internal", piiType: "none", encryptionRequired: false, retentionDays: 1095, maskingRule: "none" },
      { table: "perks", column: "value", classification: "internal", piiType: "none", encryptionRequired: false, retentionDays: 1095, maskingRule: "none" },
      { table: "perks", column: "redeemed_at", classification: "internal", piiType: "none", encryptionRequired: false, retentionDays: 1095, maskingRule: "none" },

      // Payments / Financial
      { table: "payments", column: "id", classification: "restricted", piiType: "financial", encryptionRequired: true, retentionDays: 2555, maskingRule: "none" },
      { table: "payments", column: "card_last_four", classification: "restricted", piiType: "financial", encryptionRequired: true, retentionDays: 2555, maskingRule: "partial" },
      { table: "payments", column: "amount", classification: "restricted", piiType: "financial", encryptionRequired: true, retentionDays: 2555, maskingRule: "none" },
      { table: "payments", column: "billing_address", classification: "restricted", piiType: "address", encryptionRequired: true, retentionDays: 2555, maskingRule: "partial" },
      { table: "payments", column: "stripe_customer_id", classification: "restricted", piiType: "financial", encryptionRequired: true, retentionDays: 2555, maskingRule: "full" },

      // Influencer profiles
      { table: "influencers", column: "id", classification: "internal", piiType: "none", encryptionRequired: false, retentionDays: 2555, maskingRule: "none" },
      { table: "influencers", column: "display_name", classification: "public", piiType: "name", encryptionRequired: false, retentionDays: 2555, maskingRule: "none" },
      { table: "influencers", column: "email", classification: "restricted", piiType: "email", encryptionRequired: true, retentionDays: 2555, maskingRule: "partial" },
      { table: "influencers", column: "payout_info", classification: "restricted", piiType: "financial", encryptionRequired: true, retentionDays: 2555, maskingRule: "full" },
      { table: "influencers", column: "social_handles", classification: "public", piiType: "none", encryptionRequired: false, retentionDays: 2555, maskingRule: "none" },

      // API Keys
      { table: "api_keys", column: "key_hash", classification: "restricted", piiType: "none", encryptionRequired: true, retentionDays: 365, maskingRule: "full" },
      { table: "api_keys", column: "user_id", classification: "internal", piiType: "none", encryptionRequired: false, retentionDays: 365, maskingRule: "none" },
      { table: "api_keys", column: "scopes", classification: "internal", piiType: "none", encryptionRequired: false, retentionDays: 365, maskingRule: "none" },

      // Audit logs (self-referential — audit logs are themselves classified)
      { table: "audit_logs", column: "id", classification: "internal", piiType: "none", encryptionRequired: false, retentionDays: 2555, maskingRule: "none" },
      { table: "audit_logs", column: "actor_id", classification: "internal", piiType: "none", encryptionRequired: false, retentionDays: 2555, maskingRule: "none" },
      { table: "audit_logs", column: "ip_address", classification: "confidential", piiType: "none", encryptionRequired: false, retentionDays: 2555, maskingRule: "partial" },
      { table: "audit_logs", column: "metadata", classification: "confidential", piiType: "none", encryptionRequired: false, retentionDays: 2555, maskingRule: "none" },
    ];

    for (const field of defaults) {
      this.fields.set(`${field.table}.${field.column}`, field);
    }
  }

  // ─── Classification Operations ──────────────────────────────────────────

  classify(field: DataField): void {
    this.fields.set(`${field.table}.${field.column}`, { ...field });
  }

  getField(table: string, column: string): DataField | null {
    return this.fields.get(`${table}.${column}`) ?? null;
  }

  getPolicy(classification: DataClassification): ClassificationPolicy | null {
    return this.policies.get(classification) ?? null;
  }

  getFieldsForTable(table: string): DataField[] {
    return Array.from(this.fields.values()).filter((f) => f.table === table);
  }

  getFieldsByClassification(classification: DataClassification): DataField[] {
    return Array.from(this.fields.values()).filter(
      (f) => f.classification === classification
    );
  }

  getFieldsByPII(piiType: PIIType): DataField[] {
    return Array.from(this.fields.values()).filter((f) => f.piiType === piiType);
  }

  // ─── Audit ──────────────────────────────────────────────────────────────

  audit(): {
    totalFields: number;
    classified: number;
    unclassified: number;
    encryptionRequired: number;
    piiFields: number;
    issues: Array<{ field: string; issue: string }>;
  } {
    const allFields = Array.from(this.fields.values());
    const issues: Array<{ field: string; issue: string }> = [];

    let encryptionRequired = 0;
    let piiFields = 0;

    for (const field of allFields) {
      const policy = this.policies.get(field.classification);

      if (field.piiType !== "none") {
        piiFields++;

        // PII should be at least confidential
        if (field.classification === "public" || field.classification === "internal") {
          issues.push({
            field: `${field.table}.${field.column}`,
            issue: `PII field (${field.piiType}) classified as ${field.classification} — should be at least confidential`,
          });
        }
      }

      if (field.encryptionRequired) {
        encryptionRequired++;
      }

      // Check policy enforcement
      if (policy) {
        if (policy.encryptionRequired && !field.encryptionRequired) {
          issues.push({
            field: `${field.table}.${field.column}`,
            issue: `Classification ${field.classification} requires encryption but field is not encrypted`,
          });
        }

        if (field.retentionDays > policy.retentionMaxDays) {
          issues.push({
            field: `${field.table}.${field.column}`,
            issue: `Retention (${field.retentionDays}d) exceeds max for ${field.classification} (${policy.retentionMaxDays}d)`,
          });
        }

        if (field.retentionDays < policy.retentionMinDays) {
          issues.push({
            field: `${field.table}.${field.column}`,
            issue: `Retention (${field.retentionDays}d) below min for ${field.classification} (${policy.retentionMinDays}d)`,
          });
        }
      }
    }

    return {
      totalFields: allFields.length,
      classified: allFields.length,
      unclassified: 0,
      encryptionRequired,
      piiFields,
      issues,
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// RBAC Manager
// ══════════════════════════════════════════════════════════════════════════════

export class RBACManager {
  private roles = new Map<string, Role>();
  private userAssignments = new Map<string, UserRoleAssignment>();

  constructor() {
    this.initializeDefaultRoles();
  }

  // ─── Default Roles ──────────────────────────────────────────────────────

  private initializeDefaultRoles(): void {
    const defaults: Role[] = [
      {
        id: "role_viewer",
        name: "viewer",
        permissions: [
          "campaigns:read",
          "submissions:read",
          "analytics:read",
          "settings:read",
        ],
        inherits: [],
      },
      {
        id: "role_influencer",
        name: "influencer",
        permissions: [
          "submissions:create",
          "campaigns:read",
          "users:read",
        ],
        inherits: ["role_viewer"],
      },
      {
        id: "role_member",
        name: "member",
        permissions: [
          "campaigns:create",
          "campaigns:update",
          "submissions:create",
          "submissions:review",
        ],
        inherits: ["role_viewer"],
      },
      {
        id: "role_manager",
        name: "manager",
        permissions: [
          "campaigns:delete",
          "users:create",
          "users:update",
          "billing:read",
          "analytics:export",
          "settings:manage",
        ],
        inherits: ["role_member"],
      },
      {
        id: "role_admin",
        name: "admin",
        permissions: [
          "users:delete",
          "billing:manage",
          "api_keys:create",
          "api_keys:revoke",
        ],
        inherits: ["role_manager"],
      },
      {
        id: "role_owner",
        name: "owner",
        permissions: ["admin:all"],
        inherits: ["role_admin"],
      },
    ];

    for (const role of defaults) {
      this.roles.set(role.id, role);
    }
  }

  // ─── Role Management ────────────────────────────────────────────────────

  createRole(role: Role): void {
    // Validate inherited roles exist
    for (const parentId of role.inherits) {
      if (!this.roles.has(parentId)) {
        throw new Error(`Inherited role not found: ${parentId}`);
      }
    }

    // Check for circular inheritance
    if (this.wouldCreateCircle(role.id, role.inherits)) {
      throw new Error(`Circular inheritance detected for role: ${role.id}`);
    }

    this.roles.set(role.id, { ...role });
  }

  deleteRole(roleId: string): { success: boolean; affectedUsers: string[] } {
    if (!this.roles.has(roleId)) {
      return { success: false, affectedUsers: [] };
    }

    // Check if any other role inherits from this one
    for (const [, role] of this.roles) {
      if (role.inherits.includes(roleId)) {
        throw new Error(
          `Cannot delete role ${roleId}: role ${role.id} inherits from it`
        );
      }
    }

    // Find affected users
    const affectedUsers: string[] = [];
    for (const [userId, assignment] of this.userAssignments) {
      if (assignment.roleIds.includes(roleId)) {
        affectedUsers.push(userId);
        assignment.roleIds = assignment.roleIds.filter((id) => id !== roleId);
      }
    }

    this.roles.delete(roleId);
    return { success: true, affectedUsers };
  }

  getRole(roleId: string): Role | null {
    return this.roles.get(roleId) ?? null;
  }

  listRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  // ─── User Role Assignment ───────────────────────────────────────────────

  assignRole(userId: string, roleId: string, assignedBy: string): void {
    if (!this.roles.has(roleId)) {
      throw new Error(`Role not found: ${roleId}`);
    }

    const existing = this.userAssignments.get(userId);
    if (existing) {
      if (!existing.roleIds.includes(roleId)) {
        existing.roleIds.push(roleId);
        existing.assignedAt = nowISO();
        existing.assignedBy = assignedBy;
      }
    } else {
      this.userAssignments.set(userId, {
        userId,
        roleIds: [roleId],
        assignedAt: nowISO(),
        assignedBy,
      });
    }
  }

  revokeRole(userId: string, roleId: string): boolean {
    const assignment = this.userAssignments.get(userId);
    if (!assignment) return false;

    const idx = assignment.roleIds.indexOf(roleId);
    if (idx === -1) return false;

    assignment.roleIds.splice(idx, 1);
    return true;
  }

  getUserRoles(userId: string): Role[] {
    const assignment = this.userAssignments.get(userId);
    if (!assignment) return [];

    return assignment.roleIds
      .map((id) => this.roles.get(id))
      .filter((r): r is Role => r !== undefined);
  }

  // ─── Permission Checking ────────────────────────────────────────────────

  hasPermission(userId: string, permission: Permission): boolean {
    const effectivePerms = this.getEffectivePermissions(userId);
    return effectivePerms.has("admin:all") || effectivePerms.has(permission);
  }

  getEffectivePermissions(userId: string): Set<Permission> {
    const assignment = this.userAssignments.get(userId);
    if (!assignment) return new Set();

    const permissions = new Set<Permission>();
    const visited = new Set<string>();

    const collectPermissions = (roleId: string) => {
      if (visited.has(roleId)) return;
      visited.add(roleId);

      const role = this.roles.get(roleId);
      if (!role) return;

      for (const perm of role.permissions) {
        permissions.add(perm);
      }

      for (const parentId of role.inherits) {
        collectPermissions(parentId);
      }
    };

    for (const roleId of assignment.roleIds) {
      collectPermissions(roleId);
    }

    return permissions;
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private wouldCreateCircle(roleId: string, inherits: string[]): boolean {
    const visited = new Set<string>();

    const traverse = (id: string): boolean => {
      if (id === roleId) return true;
      if (visited.has(id)) return false;
      visited.add(id);

      const role = this.roles.get(id);
      if (!role) return false;

      for (const parentId of role.inherits) {
        if (traverse(parentId)) return true;
      }
      return false;
    };

    for (const parentId of inherits) {
      if (parentId === roleId) return true;
      if (traverse(parentId)) return true;
    }
    return false;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SOC 2 Audit Logger
// ══════════════════════════════════════════════════════════════════════════════

export class SOC2AuditLogger {
  private entries: AuditEntry[] = [];
  private lastHash: string = "0000000000000000"; // Genesis hash

  // ─── Logging Methods ────────────────────────────────────────────────────

  logAccess(params: {
    actorId: string;
    actorType: AuditEntry["actorType"];
    resource: string;
    action: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): AuditEntry {
    return this.addEntry({
      type: "data_access",
      ...params,
    });
  }

  logChange(params: {
    actorId: string;
    actorType: AuditEntry["actorType"];
    resource: string;
    action: string;
    before: unknown;
    after: unknown;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): AuditEntry {
    return this.addEntry({
      type: "data_change",
      actorId: params.actorId,
      actorType: params.actorType,
      resource: params.resource,
      action: params.action,
      metadata: {
        ...(params.metadata ?? {}),
        before: params.before,
        after: params.after,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  logAuth(params: {
    actorId: string;
    event: "login" | "logout" | "failed" | "mfa";
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): AuditEntry {
    const typeMap: Record<string, AuditEventType> = {
      login: "auth_login",
      logout: "auth_logout",
      failed: "auth_failed",
      mfa: "auth_mfa",
    };

    return this.addEntry({
      type: typeMap[params.event],
      actorId: params.actorId,
      actorType: "user",
      resource: "auth",
      action: `Authentication event: ${params.event}`,
      metadata: params.metadata,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  logAdmin(params: {
    actorId: string;
    action: string;
    resource: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): AuditEntry {
    const type: AuditEventType = params.action.includes("role")
      ? "admin_role_change"
      : params.action.includes("config")
        ? "admin_config_change"
        : "admin_user_action";

    return this.addEntry({
      type,
      actorId: params.actorId,
      actorType: "user",
      resource: params.resource,
      action: params.action,
      metadata: params.metadata,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  // ─── Core Entry Creation ────────────────────────────────────────────────

  private addEntry(params: {
    type: AuditEventType;
    actorId: string;
    actorType: AuditEntry["actorType"];
    resource: string;
    action: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): AuditEntry {
    const id = generateId("audit");
    const timestamp = nowISO();

    // Compute hash chain
    const previousHash = this.lastHash;
    const entryContent = `${id}|${timestamp}|${params.type}|${params.actorId}|${params.resource}|${params.action}|${previousHash}`;
    const entryHash = simpleHash(entryContent);

    const entry: AuditEntry = {
      id,
      timestamp,
      type: params.type,
      actorId: params.actorId,
      actorType: params.actorType,
      resource: params.resource,
      action: params.action,
      metadata: params.metadata ?? {},
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      previousHash,
      entryHash,
    };

    this.entries.push(entry);
    this.lastHash = entryHash;

    return entry;
  }

  // ─── Querying ───────────────────────────────────────────────────────────

  query(filters: AuditQueryFilters): AuditEntry[] {
    let results = [...this.entries];

    if (filters.type) {
      results = results.filter((e) => e.type === filters.type);
    }
    if (filters.actorId) {
      results = results.filter((e) => e.actorId === filters.actorId);
    }
    if (filters.resource) {
      results = results.filter((e) => e.resource.includes(filters.resource!));
    }
    if (filters.after) {
      const afterTime = new Date(filters.after).getTime();
      results = results.filter((e) => new Date(e.timestamp).getTime() >= afterTime);
    }
    if (filters.before) {
      const beforeTime = new Date(filters.before).getTime();
      results = results.filter((e) => new Date(e.timestamp).getTime() <= beforeTime);
    }

    // Sort by timestamp descending (most recent first)
    results.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    if (filters.offset) {
      results = results.slice(filters.offset);
    }
    if (filters.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  // ─── Tamper Verification ────────────────────────────────────────────────

  verifyChain(): {
    valid: boolean;
    brokenAt: number | null;
    totalEntries: number;
  } {
    if (this.entries.length === 0) {
      return { valid: true, brokenAt: null, totalEntries: 0 };
    }

    let expectedPreviousHash = "0000000000000000";

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];

      if (entry.previousHash !== expectedPreviousHash) {
        return { valid: false, brokenAt: i, totalEntries: this.entries.length };
      }

      // Recompute hash
      const entryContent = `${entry.id}|${entry.timestamp}|${entry.type}|${entry.actorId}|${entry.resource}|${entry.action}|${entry.previousHash}`;
      const recomputedHash = simpleHash(entryContent);

      if (recomputedHash !== entry.entryHash) {
        return { valid: false, brokenAt: i, totalEntries: this.entries.length };
      }

      expectedPreviousHash = entry.entryHash;
    }

    return { valid: true, brokenAt: null, totalEntries: this.entries.length };
  }

  // ─── Export for Auditors ────────────────────────────────────────────────

  exportForAudit(params?: {
    startDate?: string;
    endDate?: string;
    types?: AuditEventType[];
  }): {
    exportedAt: string;
    totalEntries: number;
    chainValid: boolean;
    entries: AuditEntry[];
    summary: {
      byType: Record<string, number>;
      byActor: Record<string, number>;
      dateRange: { start: string; end: string };
    };
  } {
    let entries = [...this.entries];

    if (params?.startDate) {
      const startTime = new Date(params.startDate).getTime();
      entries = entries.filter((e) => new Date(e.timestamp).getTime() >= startTime);
    }
    if (params?.endDate) {
      const endTime = new Date(params.endDate).getTime();
      entries = entries.filter((e) => new Date(e.timestamp).getTime() <= endTime);
    }
    if (params?.types && params.types.length > 0) {
      entries = entries.filter((e) => params.types!.includes(e.type));
    }

    // Build summary
    const byType: Record<string, number> = {};
    const byActor: Record<string, number> = {};

    for (const entry of entries) {
      byType[entry.type] = (byType[entry.type] ?? 0) + 1;
      byActor[entry.actorId] = (byActor[entry.actorId] ?? 0) + 1;
    }

    const timestamps = entries.map((e) => new Date(e.timestamp).getTime());
    const start =
      timestamps.length > 0
        ? new Date(Math.min(...timestamps)).toISOString()
        : nowISO();
    const end =
      timestamps.length > 0
        ? new Date(Math.max(...timestamps)).toISOString()
        : nowISO();

    const chain = this.verifyChain();

    return {
      exportedAt: nowISO(),
      totalEntries: entries.length,
      chainValid: chain.valid,
      entries,
      summary: {
        byType,
        byActor,
        dateRange: { start, end },
      },
    };
  }

  getEntryCount(): number {
    return this.entries.length;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Encryption Manager
// ══════════════════════════════════════════════════════════════════════════════

export class EncryptionManager {
  private keys = new Map<string, { key: string; metadata: KeyMetadata }>();
  private activeKeyId: string | null = null;

  constructor() {
    // Initialize with a default key
    this.generateKey();
  }

  // ─── Key Management ─────────────────────────────────────────────────────

  private generateKey(): string {
    const keyId = generateId("key");
    const keyBytes = new Uint8Array(32);
    crypto.getRandomValues(keyBytes);
    const keyMaterial = Array.from(keyBytes, (b) =>
      b.toString(16).padStart(2, "0")
    ).join("");

    const metadata: KeyMetadata = {
      keyId,
      version: this.keys.size + 1,
      algorithm: "AES-256-GCM",
      createdAt: nowISO(),
      rotatedAt: null,
      expiresAt: null,
      status: "active",
    };

    // Deactivate previous active key
    if (this.activeKeyId) {
      const prev = this.keys.get(this.activeKeyId);
      if (prev) {
        prev.metadata.status = "rotated";
        prev.metadata.rotatedAt = nowISO();
      }
    }

    this.keys.set(keyId, { key: keyMaterial, metadata });
    this.activeKeyId = keyId;
    return keyId;
  }

  // ─── Encryption / Decryption ────────────────────────────────────────────

  encrypt(plaintext: string): EncryptedPayload {
    if (!this.activeKeyId) {
      throw new Error("No active encryption key");
    }

    const keyEntry = this.keys.get(this.activeKeyId)!;
    const { ciphertext, iv, tag } = xorEncrypt(plaintext, keyEntry.key);

    return {
      ciphertext,
      keyId: this.activeKeyId,
      keyVersion: keyEntry.metadata.version,
      iv,
      tag,
      algorithm: "AES-256-GCM",
    };
  }

  decrypt(payload: EncryptedPayload): string {
    const keyEntry = this.keys.get(payload.keyId);
    if (!keyEntry) {
      throw new Error(`Encryption key not found: ${payload.keyId}`);
    }

    return xorDecrypt(payload.ciphertext, keyEntry.key, payload.iv, payload.tag);
  }

  // ─── Key Rotation ──────────────────────────────────────────────────────

  rotateKey(): {
    newKeyId: string;
    previousKeyId: string | null;
    reEncryptionNeeded: boolean;
  } {
    const previousKeyId = this.activeKeyId;
    const newKeyId = this.generateKey();

    return {
      newKeyId,
      previousKeyId,
      reEncryptionNeeded: true, // Caller should re-encrypt affected data
    };
  }

  /**
   * Re-encrypt data from an old key to the current active key.
   */
  reEncrypt(payload: EncryptedPayload): EncryptedPayload {
    const plaintext = this.decrypt(payload);
    return this.encrypt(plaintext);
  }

  getKeyMetadata(keyId?: string): KeyMetadata | null {
    const id = keyId ?? this.activeKeyId;
    if (!id) return null;
    const entry = this.keys.get(id);
    return entry ? { ...entry.metadata } : null;
  }

  listKeys(): KeyMetadata[] {
    return Array.from(this.keys.values()).map((e) => ({ ...e.metadata }));
  }

  // ─── Field Masking ──────────────────────────────────────────────────────

  maskField(value: string, rule: MaskingRule): string {
    switch (rule) {
      case "none":
        return value;

      case "full":
        return "***REDACTED***";

      case "hash":
        return simpleHash(value);

      case "partial":
        return this.applyPartialMask(value);

      default:
        return value;
    }
  }

  private applyPartialMask(value: string): string {
    // Email masking: j***@example.com
    if (value.includes("@")) {
      const [local, domain] = value.split("@");
      if (local.length <= 1) return `*@${domain}`;
      return `${local[0]}${"*".repeat(Math.min(local.length - 1, 5))}@${domain}`;
    }

    // Phone masking: ***-***-1234
    if (/^\+?\d[\d\s\-()]{7,}$/.test(value)) {
      const digits = value.replace(/\D/g, "");
      if (digits.length >= 4) {
        return `***-***-${digits.slice(-4)}`;
      }
    }

    // Name masking: John D***
    if (value.includes(" ")) {
      const parts = value.split(" ");
      return parts
        .map((part, i) => {
          if (i === 0) return part;
          return part[0] + "*".repeat(Math.min(part.length - 1, 4));
        })
        .join(" ");
    }

    // Generic: show first and last char
    if (value.length <= 2) return "*".repeat(value.length);
    return `${value[0]}${"*".repeat(value.length - 2)}${value[value.length - 1]}`;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Retention Enforcer
// ══════════════════════════════════════════════════════════════════════════════

export class RetentionEnforcer {
  private records = new Map<string, RetentionRecord>(); // key: `${table}:${recordId}`
  private dataClassifier: DataClassifier;

  constructor(dataClassifier: DataClassifier) {
    this.dataClassifier = dataClassifier;
  }

  // ─── Record Registration ────────────────────────────────────────────────

  registerRecord(params: {
    table: string;
    recordId: string;
    classification?: DataClassification;
    createdAt?: string;
    retentionDaysOverride?: number;
  }): RetentionRecord {
    const key = `${params.table}:${params.recordId}`;

    // Get retention from classification or use default
    const fields = this.dataClassifier.getFieldsForTable(params.table);
    const classification = params.classification ??
      (fields.length > 0
        ? this.getHighestClassification(fields.map((f) => f.classification))
        : "internal");

    // Use the highest retention from the table's fields, or override
    const retentionDays =
      params.retentionDaysOverride ??
      (fields.length > 0
        ? Math.max(...fields.map((f) => f.retentionDays))
        : 365);

    const createdAt = params.createdAt ?? nowISO();
    const expiresAt = new Date(
      new Date(createdAt).getTime() + retentionDays * 24 * 60 * 60 * 1000
    ).toISOString();

    const record: RetentionRecord = {
      table: params.table,
      recordId: params.recordId,
      classification,
      createdAt,
      retentionDays,
      expiresAt,
      legalHold: false,
      legalHoldReason: null,
      purgedAt: null,
    };

    this.records.set(key, record);
    return record;
  }

  // ─── Retention Checking ─────────────────────────────────────────────────

  checkRetention(): {
    expired: RetentionRecord[];
    expiringSoon: RetentionRecord[]; // within 30 days
    held: RetentionRecord[];
  } {
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    const expired: RetentionRecord[] = [];
    const expiringSoon: RetentionRecord[] = [];
    const held: RetentionRecord[] = [];

    for (const record of this.records.values()) {
      if (record.purgedAt) continue; // Already purged

      if (record.legalHold) {
        held.push(record);
        continue;
      }

      const expiresAtMs = new Date(record.expiresAt).getTime();

      if (expiresAtMs <= now) {
        expired.push(record);
      } else if (expiresAtMs <= now + thirtyDaysMs) {
        expiringSoon.push(record);
      }
    }

    return { expired, expiringSoon, held };
  }

  // ─── Purging ────────────────────────────────────────────────────────────

  purge(): {
    purgedCount: number;
    skippedHolds: number;
    purgedRecords: Array<{ table: string; recordId: string }>;
  } {
    const { expired } = this.checkRetention();

    const purgedRecords: Array<{ table: string; recordId: string }> = [];
    let skippedHolds = 0;

    for (const record of expired) {
      if (record.legalHold) {
        skippedHolds++;
        continue;
      }

      record.purgedAt = nowISO();
      purgedRecords.push({ table: record.table, recordId: record.recordId });
    }

    return {
      purgedCount: purgedRecords.length,
      skippedHolds,
      purgedRecords,
    };
  }

  // ─── Reporting ──────────────────────────────────────────────────────────

  getRetentionReport(): RetentionReport {
    const now = Date.now();

    const byClassification: Record<
      DataClassification,
      { total: number; expired: number; held: number; purged: number }
    > = {
      public: { total: 0, expired: 0, held: 0, purged: 0 },
      internal: { total: 0, expired: 0, held: 0, purged: 0 },
      confidential: { total: 0, expired: 0, held: 0, purged: 0 },
      restricted: { total: 0, expired: 0, held: 0, purged: 0 },
    };

    const byTable: Record<
      string,
      { total: number; expired: number; held: number; purged: number }
    > = {};

    let totalRecords = 0;
    let expiredRecords = 0;
    let heldRecords = 0;
    let purgedRecords = 0;

    for (const record of this.records.values()) {
      totalRecords++;

      // Initialize table bucket
      if (!byTable[record.table]) {
        byTable[record.table] = { total: 0, expired: 0, held: 0, purged: 0 };
      }

      byClassification[record.classification].total++;
      byTable[record.table].total++;

      if (record.purgedAt) {
        purgedRecords++;
        byClassification[record.classification].purged++;
        byTable[record.table].purged++;
      } else if (record.legalHold) {
        heldRecords++;
        byClassification[record.classification].held++;
        byTable[record.table].held++;
      } else if (new Date(record.expiresAt).getTime() <= now) {
        expiredRecords++;
        byClassification[record.classification].expired++;
        byTable[record.table].expired++;
      }
    }

    return {
      totalRecords,
      expiredRecords,
      heldRecords,
      purgedRecords,
      byClassification,
      byTable,
    };
  }

  // ─── Legal Hold ─────────────────────────────────────────────────────────

  setRetentionOverride(
    table: string,
    recordId: string,
    hold: boolean,
    reason?: string
  ): boolean {
    const key = `${table}:${recordId}`;
    const record = this.records.get(key);
    if (!record) return false;

    record.legalHold = hold;
    record.legalHoldReason = hold ? (reason ?? "Legal hold applied") : null;
    return true;
  }

  /**
   * Apply a legal hold to all records in a table.
   */
  setTableHold(table: string, hold: boolean, reason?: string): number {
    let count = 0;
    for (const record of this.records.values()) {
      if (record.table === table && !record.purgedAt) {
        record.legalHold = hold;
        record.legalHoldReason = hold ? (reason ?? "Legal hold applied") : null;
        count++;
      }
    }
    return count;
  }

  getRecord(table: string, recordId: string): RetentionRecord | null {
    return this.records.get(`${table}:${recordId}`) ?? null;
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private getHighestClassification(
    classifications: DataClassification[]
  ): DataClassification {
    const order: DataClassification[] = [
      "public",
      "internal",
      "confidential",
      "restricted",
    ];
    let highest = 0;
    for (const c of classifications) {
      const idx = order.indexOf(c);
      if (idx > highest) highest = idx;
    }
    return order[highest];
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Factory & Convenience
// ══════════════════════════════════════════════════════════════════════════════

export interface SOC2Infrastructure {
  dataClassifier: DataClassifier;
  rbacManager: RBACManager;
  auditLogger: SOC2AuditLogger;
  encryptionManager: EncryptionManager;
  retentionEnforcer: RetentionEnforcer;
}

/**
 * Create a fully wired SOC 2 compliance infrastructure with all components connected.
 */
export function createSOC2Infrastructure(): SOC2Infrastructure {
  const dataClassifier = new DataClassifier();
  const rbacManager = new RBACManager();
  const auditLogger = new SOC2AuditLogger();
  const encryptionManager = new EncryptionManager();
  const retentionEnforcer = new RetentionEnforcer(dataClassifier);

  return {
    dataClassifier,
    rbacManager,
    auditLogger,
    encryptionManager,
    retentionEnforcer,
  };
}
