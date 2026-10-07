import type { ProviderPack } from "../types.ts";

/**
 * Provider packs. Each rule cites a public source: an RFC, a published
 * postmaster page, or the receiver's own documented error reference.
 *
 * These are starting points, not a complete map of any receiver's behaviour.
 * Receivers change wording without notice, so treat a provider rule as a
 * refinement of the generic result rather than as the authority.
 */
export const providers: ProviderPack[] = [
  {
    name: "google",
    match: /(gmail\.com|googlemail\.com|google\.com|\bgsmtp\b|aspmx\.l\.google\.com)/i,
    rules: [
      {
        id: "google.blocked-unsolicited",
        pattern: /unsolicited mail originating from your IP address|Our system has detected that this message is likely unsolicited/i,
        outcome: "spam_block",
        source: "Google Workspace Admin Help, Gmail SMTP error reference 550 5.7.1",
      },
      {
        id: "google.rate-limited",
        pattern: /Try again later, closing connection|unusual rate of unsolicited mail|temporarily rate limited/i,
        outcome: "rate_limited",
        retryAfter: 1800,
        source: "Gmail SMTP error reference 421 4.7.0",
      },
      {
        id: "google.no-account",
        pattern: /The email account that you tried to reach does not exist/i,
        outcome: "invalid_recipient",
        source: "Gmail SMTP error reference 550 5.1.1",
      },
      {
        id: "google.over-quota",
        pattern: /The email account that you tried to reach is over quota/i,
        outcome: "soft_bounce",
        source: "Gmail SMTP error reference 552 5.2.2",
      },
      {
        id: "google.auth-required",
        pattern: /this message does not (have authentication information|pass authentication checks)|does not meet IPv6 sending guidelines regarding PTR records and authentication/i,
        outcome: "auth_failure",
        source: "Gmail sender guidelines, authentication requirements",
      },
    ],
  },
  {
    name: "microsoft",
    match: /(outlook\.com|hotmail\.com|live\.com|office365\.com|protection\.outlook\.com|\bolc\.protection\b)/i,
    rules: [
      {
        id: "microsoft.banned-ip",
        pattern: /5\.7\.606|Access denied, banned sending IP/i,
        outcome: "policy_block",
        source: "Microsoft 365 error code reference, 5.7.606 banned sending IP",
      },
      {
        id: "microsoft.deferred-reputation",
        pattern: /temporarily (deferred|rate limited) due to (IP reputation|unexpected volume)|4\.7\.(500|650)/i,
        outcome: "rate_limited",
        retryAfter: 1800,
        source: "Outlook.com postmaster, deferral and throttling guidance",
      },
      {
        id: "microsoft.not-sent",
        pattern: /Unfortunately, messages from .* weren'?t sent/i,
        outcome: "policy_block",
        source: "Outlook.com postmaster, 550 5.7.1 blocked sender",
      },
      {
        id: "microsoft.recipient-not-found",
        pattern: /Requested action not taken: mailbox unavailable|RecipientNotFound|5\.1\.10/i,
        outcome: "invalid_recipient",
        source: "Microsoft 365 error code reference, 5.1.10 recipient not found",
      },
    ],
  },
  {
    name: "yahoo",
    match: /(yahoo\.com|yahoo\.co\.[a-z]{2}|ymail\.com|rocketmail\.com|aol\.com|yahoodns\.net)/i,
    rules: [
      {
        id: "yahoo.complaints",
        pattern: /\[TSS04\]|temporarily deferred due to user complaints/i,
        outcome: "policy_block",
        retryAfter: 3600,
        source: "Yahoo postmaster error code reference, TSS04 complaint deferral",
      },
      {
        id: "yahoo.rate-limited",
        pattern: /\[TS03\]|\[TSS0[1-3]\]|Messages from .* temporarily deferred/i,
        outcome: "rate_limited",
        retryAfter: 1800,
        source: "Yahoo postmaster error code reference, TS03 and TSS01 to TSS03",
      },
      {
        id: "yahoo.no-account",
        pattern: /This user does ?n[o']t have a .* account|\[#?5\.1\.1\]/i,
        outcome: "invalid_recipient",
        source: "Yahoo postmaster error code reference, 554 delivery error",
      },
    ],
  },
  {
    name: "apple",
    match: /(icloud\.com|me\.com|mac\.com|apple\.com|mail\.icloud\.com)/i,
    rules: [
      {
        id: "apple.unknown-alias",
        pattern: /unknown or illegal alias|user does ?not exist/i,
        outcome: "invalid_recipient",
        source: "iCloud Mail postmaster guidance, 550 5.1.1",
      },
      {
        id: "apple.rate-limited",
        pattern: /Too many (messages|connections) from|please try again later/i,
        outcome: "rate_limited",
        retryAfter: 1800,
        source: "iCloud Mail postmaster guidance, connection limits",
      },
    ],
  },
];
