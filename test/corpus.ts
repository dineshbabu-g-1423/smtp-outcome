import type { Outcome } from "../src/types.ts";

export interface Case {
  response: string;
  recipient?: string;
  outcome: Outcome;
  note: string;
}

/**
 * Responses and the verdict each should produce. Wording is representative
 * of what receivers publish in their own error references; the corpus is
 * meant to grow, and a pull request adding a real response plus its expected
 * classification is the most useful contribution this project can get.
 */
export const corpus: Case[] = [
  // Invalid recipient
  { response: "550 5.1.1 The email account that you tried to reach does not exist", recipient: "x@gmail.com", outcome: "invalid_recipient", note: "Gmail, no such account" },
  { response: "550 5.1.1 <x@example.com>: Recipient address rejected: User unknown", outcome: "invalid_recipient", note: "Postfix, user unknown" },
  { response: "554 delivery error: dd This user doesn't have a yahoo.com account", recipient: "x@yahoo.com", outcome: "invalid_recipient", note: "Yahoo, no account" },
  { response: "550 5.1.1 unknown or illegal alias", recipient: "x@icloud.com", outcome: "invalid_recipient", note: "iCloud, unknown alias" },

  // Soft bounce
  { response: "552 5.2.2 The email account that you tried to reach is over quota", recipient: "x@gmail.com", outcome: "soft_bounce", note: "Gmail, over quota" },
  { response: "452 4.2.2 Mailbox full", outcome: "soft_bounce", note: "Generic mailbox full, transient class" },

  // Rate limited
  { response: "421 4.7.0 Try again later, closing connection", recipient: "x@gmail.com", outcome: "rate_limited", note: "Gmail, rate limiting" },
  { response: "421 4.7.0 [TS03] Messages from 203.0.113.9 temporarily deferred", recipient: "x@yahoo.com", outcome: "rate_limited", note: "Yahoo TS03" },
  { response: "451 4.5.3 Too many recipients", outcome: "deferred", note: "RFC 3463 5.3 falls under protocol, retried" },
  { response: "450 4.4.5 Mail system congestion, try again later", outcome: "rate_limited", note: "RFC 3463 4.5 congestion" },

  // Policy and reputation
  { response: "550 5.7.606 Access denied, banned sending IP [203.0.113.9]", recipient: "x@outlook.com", outcome: "policy_block", note: "Microsoft, banned IP" },
  { response: "421 4.7.0 [TSS04] Messages temporarily deferred due to user complaints", recipient: "x@yahoo.com", outcome: "policy_block", note: "Yahoo, complaint deferral" },

  // Spam
  { response: "550 5.7.1 Our system has detected that this message is likely unsolicited mail", recipient: "x@gmail.com", outcome: "spam_block", note: "Gmail, unsolicited" },
  { response: "554 5.7.1 Message rejected: listed on Spamhaus SBL", outcome: "spam_block", note: "Blocklist rejection" },

  // Authentication
  { response: "550 5.7.23 SPF validation failed", outcome: "auth_failure", note: "RFC 7372 7.23" },
  { response: "550 5.7.20 No passing DKIM signature found", outcome: "auth_failure", note: "RFC 7372 7.20" },
  { response: "550 5.7.26 Multiple authentication checks failed", outcome: "auth_failure", note: "RFC 7372 7.26" },

  // Transient, no judgement
  { response: "451 4.4.1 No answer from host", outcome: "deferred", note: "RFC 3463 4.1" },
  { response: "450 4.2.0 Greylisted, try again in 300 seconds", outcome: "deferred", note: "Greylisting" },

  // Class downgrade: a 4.x.x that maps to a permanent-looking subject
  { response: "451 4.1.1 Temporary lookup failure for recipient", outcome: "deferred", note: "4.x.x must not resolve to invalid_recipient" },

  // Fallback
  { response: "500 Syntax error, command unrecognised", outcome: "hard_bounce", note: "Unmatched 5xx falls back to hard" },
  { response: "400 Something went wrong", outcome: "unknown", note: "Unmatched 4xx stays unknown and is retried" },
];
