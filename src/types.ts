/**
 * The normalised outcome of a delivery attempt.
 *
 * The taxonomy is deliberately small. Every extra category is one more
 * decision a caller has to make, and most senders only act on four things:
 * stop sending, try again soon, try again later, or look at it yourself.
 */
export type Outcome =
  /** The address will never accept mail. Suppress it. */
  | "invalid_recipient"
  /** Permanent failure that is not about the address itself. Suppress. */
  | "hard_bounce"
  /** Mailbox exists but could not take the message now, e.g. over quota. */
  | "soft_bounce"
  /** Transient failure with no judgement attached. Retry on the normal curve. */
  | "deferred"
  /** The receiver is asking you to slow down. Retry with a wider gap. */
  | "rate_limited"
  /** Refused on reputation, content or sender policy. A human should see this. */
  | "policy_block"
  /** Refused because authentication failed: SPF, DKIM, DMARC or rDNS. */
  | "auth_failure"
  /** Refused as spam. Distinct from policy_block because the fix differs. */
  | "spam_block"
  /** Nothing matched. Treated as deferred on a 4xx and hard on a 5xx. */
  | "unknown";

/** What the sender should do with this recipient next. */
export type Action = "suppress" | "retry" | "defer" | "review";

export interface Classification {
  outcome: Outcome;
  action: Action;
  /** true when the reply code or enhanced status says permanent. */
  permanent: boolean;
  /** Primary SMTP reply code, e.g. 550. Null when it could not be read. */
  code: number | null;
  /** Enhanced status code from RFC 3463, e.g. "5.1.1". Null when absent. */
  enhanced: string | null;
  /** Receiver this was matched as, or "generic" when no provider rule hit. */
  provider: string;
  /** Identifier of the rule that matched, for debugging and for tests. */
  rule: string;
  /** Seconds to wait before the next attempt, when the receiver implies one. */
  retryAfter?: number;
}

export interface Rule {
  id: string;
  /** Matched against the full response text, case-insensitively. */
  pattern: RegExp;
  outcome: Outcome;
  retryAfter?: number;
  /** Where this rule comes from. Every rule must cite something. */
  source: string;
}

export interface ProviderPack {
  name: string;
  /** Matched against the recipient domain and against the response text. */
  match: RegExp;
  rules: Rule[];
}
