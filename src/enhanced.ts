import type { Outcome } from "./types.ts";

/**
 * Enhanced status codes, RFC 3463, extended by RFC 7372 (authentication)
 * and RFC 7505 (null MX).
 *
 * Keyed on the subject and detail parts only. The class digit is read
 * separately, because the same subject.detail can arrive as 4.x.x or 5.x.x
 * and the class is what decides whether it is permanent.
 */
const SUBJECT_DETAIL: Record<string, Outcome> = {
  // 1.x.x — addressing
  "1.1": "invalid_recipient", // Bad destination mailbox address
  "1.2": "invalid_recipient", // Bad destination system address
  "1.3": "invalid_recipient", // Bad destination mailbox address syntax
  "1.6": "invalid_recipient", // Destination mailbox has moved, no forwarding
  "1.10": "invalid_recipient", // Recipient address has null MX (RFC 7505)

  // 2.x.x — mailbox
  "2.1": "soft_bounce", // Mailbox disabled, not accepting messages
  "2.2": "soft_bounce", // Mailbox full
  "2.3": "hard_bounce", // Message length exceeds administrative limit
  "2.4": "soft_bounce", // Mailing list expansion problem

  // 3.x.x — mail system
  "3.1": "deferred", // Mail system full
  "3.2": "deferred", // System not accepting network messages
  "3.4": "hard_bounce", // Message too big for system

  // 4.x.x — network and routing
  "4.1": "deferred", // No answer from host
  "4.2": "deferred", // Bad connection
  "4.3": "deferred", // Directory server failure
  "4.4": "deferred", // Unable to route
  "4.5": "rate_limited", // Mail system congestion
  "4.7": "hard_bounce", // Delivery time expired

  // 5.x.x — protocol
  "5.3": "deferred", // Too many recipients

  // 6.x.x — content
  "6.2": "policy_block", // Conversion required and prohibited
  "6.3": "hard_bounce", // Conversion required but not supported

  // 7.x.x — policy and security
  "7.0": "policy_block", // Other or undefined security status
  "7.1": "policy_block", // Delivery not authorized, message refused
  "7.2": "policy_block", // Mailing list expansion prohibited
  "7.4": "policy_block", // Security features not supported
  "7.5": "auth_failure", // Cryptographic failure
  "7.6": "auth_failure", // Key not valid for this algorithm
  "7.7": "auth_failure", // Message integrity failure
  // RFC 7372 — authentication results
  "7.20": "auth_failure", // No passing DKIM signature found
  "7.21": "auth_failure", // No acceptable DKIM signature found
  "7.22": "auth_failure", // No valid author-matched DKIM signature found
  "7.23": "auth_failure", // SPF validation failed
  "7.24": "auth_failure", // SPF validation error
  "7.25": "auth_failure", // Reverse DNS validation failed
  "7.26": "auth_failure", // Multiple authentication checks failed
  "7.27": "invalid_recipient", // Sender address has null MX
};

/** Pull an enhanced status code out of a response, if one is present. */
export function parseEnhanced(text: string): string | null {
  // Must appear at a token boundary, after the reply code, to avoid
  // matching version numbers or IP fragments inside free text.
  const m = text.match(/\b([245])\.(\d{1,3})\.(\d{1,3})\b/);
  return m ? `${m[1]}.${m[2]}.${m[3]}` : null;
}

/** Map an enhanced status code to an outcome, or null when unrecognised. */
export function outcomeFromEnhanced(enhanced: string | null): Outcome | null {
  if (!enhanced) return null;
  const parts = enhanced.split(".");
  const cls = parts[0];
  const key = `${parts[1]}.${parts[2]}`;
  const mapped = SUBJECT_DETAIL[key];
  if (!mapped) return null;
  // A 4.x.x is transient by definition, so a mapping that implies permanence
  // is downgraded rather than trusted.
  if (cls === "4" && (mapped === "hard_bounce" || mapped === "invalid_recipient")) {
    return "deferred";
  }
  return mapped;
}
