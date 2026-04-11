/**
 * POST /api/v1/auth/totp
 *
 * TOTP (2FA) management endpoint.
 * Actions: setup, verify, disable, status
 *
 * Auth required for all actions.
 */

import { NextRequest } from "next/server";
import {
  ok,
  err,
  requireAuth,
  rateLimit,
  parseBody,
  withTiming,
} from "../../_shared";
import {
  generateTOTPSecret,
  generateTOTPUri,
  verifyTOTP,
} from "@/lib/auth/totp";

// ─── In-memory TOTP store (replace with DB in production) ────────────────────

interface TOTPRecord {
  secret: string;
  enabled: boolean;
  pendingSecret?: string;
  backupCodes?: string[];
}

const totpSecrets = new Map<string, TOTPRecord>();

// ─── POST ────────────────────────────────────────────────────────────────────

export const POST = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  const user = requireAuth(req);
  if (user instanceof Response) return user;

  const body = await parseBody<{ action: string; code?: string }>(req);
  if (body instanceof Response) return body;

  const { action, code } = body;

  if (!action || typeof action !== "string") {
    return err(
      "MISSING_ACTION",
      "action is required (setup, verify, disable, status)",
      400
    );
  }

  switch (action) {
    // ── Setup: Generate a new TOTP secret ──────────────────────────────────
    case "setup": {
      const secret = generateTOTPSecret();
      const uri = generateTOTPUri(secret, user.email);

      // Store as pending until the user verifies with a code
      const existing = totpSecrets.get(user.id) || {
        secret: "",
        enabled: false,
      };
      totpSecrets.set(user.id, { ...existing, pendingSecret: secret });

      return ok({ uri, secret });
    }

    // ── Verify: Confirm TOTP setup with a code from the authenticator ──────
    case "verify": {
      if (!code || typeof code !== "string") {
        return err("MISSING_CODE", "TOTP code is required", 400);
      }

      const record = totpSecrets.get(user.id);
      if (!record?.pendingSecret) {
        return err(
          "NO_PENDING_SETUP",
          "No TOTP setup in progress. Call setup first.",
          400
        );
      }

      if (!verifyTOTP(record.pendingSecret, code)) {
        return err("INVALID_CODE", "Invalid TOTP code", 400);
      }

      // Generate backup codes
      const backupCodes = Array.from({ length: 8 }, () =>
        Math.random().toString(36).slice(2, 8).toUpperCase()
      );

      // Enable TOTP
      totpSecrets.set(user.id, {
        secret: record.pendingSecret,
        enabled: true,
        backupCodes,
      });

      return ok({ enabled: true, backupCodes });
    }

    // ── Disable: Turn off 2FA (requires valid code) ────────────────────────
    case "disable": {
      if (!code || typeof code !== "string") {
        return err("MISSING_CODE", "TOTP code is required to disable 2FA", 400);
      }

      const record = totpSecrets.get(user.id);
      if (!record?.enabled) {
        return err("NOT_ENABLED", "2FA is not enabled on this account", 400);
      }

      if (!verifyTOTP(record.secret, code)) {
        return err("INVALID_CODE", "Invalid TOTP code", 400);
      }

      totpSecrets.set(user.id, { secret: "", enabled: false });
      return ok({ enabled: false });
    }

    // ── Status: Check if 2FA is enabled ────────────────────────────────────
    case "status": {
      const record = totpSecrets.get(user.id);
      return ok({ enabled: record?.enabled || false });
    }

    default:
      return err(
        "INVALID_ACTION",
        "action must be one of: setup, verify, disable, status",
        400
      );
  }
});
