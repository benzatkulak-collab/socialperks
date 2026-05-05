/**
 * Discriminated error class. Catch on `error.code` not on string match.
 *
 * Codes mirror the categories the API can return; we add `network` for
 * fetch-level failures (DNS, timeout) so callers can decide whether
 * to retry vs surface to the user.
 */
export type SocialPerksErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "rate_limited"
  | "validation"
  | "server"
  | "network"
  | "timeout"
  | "unknown";

export class SocialPerksError extends Error {
  public readonly code: SocialPerksErrorCode;
  public readonly status: number;
  public readonly requestId?: string;
  public readonly details?: unknown;

  constructor(args: {
    code: SocialPerksErrorCode;
    message: string;
    status: number;
    requestId?: string;
    details?: unknown;
  }) {
    super(args.message);
    this.name = "SocialPerksError";
    this.code = args.code;
    this.status = args.status;
    this.requestId = args.requestId;
    this.details = args.details;
  }

  static fromStatus(status: number, body: unknown, requestId?: string): SocialPerksError {
    const code: SocialPerksErrorCode =
      status === 401 ? "unauthorized" :
      status === 403 ? "forbidden" :
      status === 404 ? "not_found" :
      status === 429 ? "rate_limited" :
      status >= 500 ? "server" :
      status >= 400 ? "validation" :
      "unknown";
    const message =
      typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
        ? body.error
        : `HTTP ${status}`;
    return new SocialPerksError({ code, message, status, requestId, details: body });
  }
}
