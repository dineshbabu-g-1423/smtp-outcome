import type { Rule } from "../types.ts";

/**
 * Receiver-independent rules, matched on response text when no provider
 * pack claims the message and the enhanced status code did not resolve it.
 * Ordered most specific first.
 */
export const genericRules: Rule[] = [
  {
    id: "generic.no-such-user",
    pattern: /\b(no such (user|mailbox|recipient)|user unknown|recipient (address )?rejected|does ?n[o']t exist|unknown user|invalid recipient|address rejected)\b/i,
    outcome: "invalid_recipient",
    source: "Common wording across receivers for RFC 3463 X.1.1",
  },
  {
    id: "generic.mailbox-full",
    pattern: /\b(mailbox (is )?full|over ?quota|quota exceeded|insufficient storage)\b/i,
    outcome: "soft_bounce",
    source: "RFC 3463 X.2.2 mailbox full",
  },
  {
    id: "generic.rate-limited",
    pattern: /\b(rate limit|too many (messages|connections)|throttl|slow down|try again later|temporarily deferred|connection frequency|exceeded the maximum)\b/i,
    outcome: "rate_limited",
    retryAfter: 900,
    source: "RFC 3463 X.4.5 mail system congestion",
  },
  {
    id: "generic.spam",
    pattern: /\b(spam|bulk mail|unsolicited|content rejected|message (looks like|appears to be) spam|spamhaus|blocklist|blacklist|rbl|dnsbl)\b/i,
    outcome: "spam_block",
    source: "Receiver anti-spam rejections, RFC 3463 X.7.1",
  },
  {
    id: "generic.auth",
    pattern: /\b(spf|dkim|dmarc|sender policy framework|domainkeys|authentication fail|not authenticated|reverse dns|ptr record)\b/i,
    outcome: "auth_failure",
    source: "RFC 7372 authentication status codes X.7.20 to X.7.27",
  },
  {
    id: "generic.policy",
    pattern: /\b(not authori[sz]ed|access denied|policy|blocked|refused|rejected due to|not permitted|prohibited)\b/i,
    outcome: "policy_block",
    source: "RFC 3463 X.7.1 delivery not authorized",
  },
  {
    id: "generic.greylist",
    pattern: /\b(greylist|grey ?list|try again in|deferred: )\b/i,
    outcome: "deferred",
    retryAfter: 300,
    source: "Greylisting convention, RFC 6647 section 2.2",
  },
];
