/**
 * Contact Form API Route — /api/v1/contact
 *
 * POST: Accepts a contact form submission, validates inputs,
 *       and sends an email to the support address.
 * Rate limit: strict tier (prevent spam)
 * No auth required.
 */

import type { NextRequest } from "next/server";
import { ok, err, rateLimit, parseBody, withTiming } from "../_shared";
import { validateEmail, validateString, validateEnum } from "@/lib/security/validate";
import { emailProvider, contactFormEmail } from "@/lib/email";

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@socialperks.app";

const SUBJECTS = [
  "General Question",
  "Technical Support",
  "Billing",
  "Partnership",
  "Bug Report",
  "Feature Request",
] as const;

type ContactSubject = (typeof SUBJECTS)[number];

interface ContactBody {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export const POST = withTiming(async (req: NextRequest) => {
  // Rate limit — strict tier to prevent spam
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  // Parse body
  const body = await parseBody<ContactBody>(req);
  if (body instanceof Response) return body;

  // Validate fields
  const nameResult = validateString(body.name, "Name", { min: 1, max: 100 });
  if (!nameResult.success) return err("INVALID_NAME", nameResult.error, 400);

  const emailResult = validateEmail(body.email);
  if (!emailResult.success) return err("INVALID_EMAIL", emailResult.error, 400);

  const subjectResult = validateEnum<ContactSubject>(body.subject, "Subject", SUBJECTS);
  if (!subjectResult.success) return err("INVALID_SUBJECT", subjectResult.error, 400);

  const messageResult = validateString(body.message, "Message", { min: 20, max: 5000 });
  if (!messageResult.success) return err("INVALID_MESSAGE", messageResult.error, 400);

  // Build email from template
  const template = contactFormEmail(
    nameResult.data,
    emailResult.data,
    subjectResult.data,
    messageResult.data
  );

  // Send email to support address. Sender intentionally omitted so
  // the EmailProvider falls back to its EMAIL_FROM env var (which is
  // the only From address Resend's domain table has actually
  // verified). Hard-coding noreply@socialperks.app here caused every
  // contact form submission to fail with EMAIL_FAILED 500 because
  // socialperks.app is not a verified Resend sending domain on the
  // current plan.
  const result = await emailProvider.send({
    to: SUPPORT_EMAIL,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });

  if (!result.success) {
    console.error("[contact] Email send failed:", result.error);
    return err("EMAIL_FAILED", "Unable to send your message. Please try again.", 500);
  }

  return ok({ message: "Your message has been sent. We'll get back to you within 24 hours." });
});
