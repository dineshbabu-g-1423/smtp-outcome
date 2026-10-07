import type { Classification, Outcome, Action, Rule } from "./types.ts";
import { parseEnhanced, outcomeFromEnhanced } from "./enhanced.ts";
import { genericRules } from "./providers/generic.ts";
import { providers } from "./providers/index.ts";
import { parseDsn } from "./dsn.ts";

export interface ClassifyInput {
  /** The SMTP response line, or the Diagnostic-Code text from a DSN. */
  response: string;
  /** Recipient address or domain, used to pick a provider pack. */
  recipient?: string;
}

const ACTION_BY_OUTCOME: Record<Outcome, Action> = {
  invalid_recipient: "suppress",
  hard_bounce: "suppress",
  soft_bounce: "defer",
  deferred: "retry",
  rate_limited: "defer",
  policy_block: "review",
  auth_failure: "review",
  spam_block: "review",
  unknown: "retry",
};

function parseCode(text: string): number | null {
  const m = text.match(/\b([2345]\d{2})\b/);
  return m && m[1] ? Number(m[1]) : null;
}

function firstMatch(rules: Rule[], text: string): Rule | null {
  for (const rule of rules) if (rule.pattern.test(text)) return rule;
  return null;
}

/**
 * Classify a single SMTP response.
 *
 * Resolution order, most trustworthy first:
 *   1. a provider rule, when the recipient or the response names a receiver
 *   2. the enhanced status code, which is standardised
 *   3. a generic text rule
 *   4. the reply code class alone
 *
 * Provider rules come first because a receiver's own wording is more precise
 * than the status code it chose to attach, and receivers frequently attach a
 * generic 5.7.1 to very different situations.
 */
export function classify(input: ClassifyInput): Classification {
  const text = input.response ?? "";
  const code = parseCode(text);
  const enhanced = parseEnhanced(text);
  const permanent =
    enhanced?.startsWith("5") ?? (code !== null ? code >= 500 : false);

  const haystack = `${input.recipient ?? ""} ${text}`;
  const pack = providers.find((p) => p.match.test(haystack)) ?? null;

  if (pack) {
    const hit = firstMatch(pack.rules, text);
    if (hit) return build(hit.outcome, hit.id, pack.name, code, enhanced, permanent, hit.retryAfter);
  }

  const fromEnhanced = outcomeFromEnhanced(enhanced);
  const generic = firstMatch(genericRules, text);

  // X.7.1 is the catch-all policy code. Receivers attach it to spam blocks,
  // authentication failures and reputation blocks alike, so when the text
  // says something more specific the text wins. Every other enhanced code
  // is narrow enough to trust over free-form wording.
  const enhancedIsVague = fromEnhanced === "policy_block";
  if (fromEnhanced && !(enhancedIsVague && generic)) {
    return build(fromEnhanced, `rfc3463.${enhanced}`, pack?.name ?? "generic", code, enhanced, permanent);
  }

  if (generic) {
    return build(generic.outcome, generic.id, pack?.name ?? "generic", code, enhanced, permanent, generic.retryAfter);
  }

  // Nothing matched. Fall back to the reply code class, which at least tells
  // us whether to try again. Marked unknown so callers can log and improve.
  const outcome: Outcome = permanent ? "hard_bounce" : "unknown";
  return build(outcome, "fallback.reply-code", pack?.name ?? "generic", code, enhanced, permanent);
}

/** Classify from a full DSN body, RFC 3464. */
export function classifyDsn(body: string): Classification {
  const dsn = parseDsn(body);
  const response = [dsn.status, dsn.diagnostic].filter(Boolean).join(" ");
  return dsn.recipient === null
    ? classify({ response })
    : classify({ response, recipient: dsn.recipient });
}

function build(
  outcome: Outcome,
  rule: string,
  provider: string,
  code: number | null,
  enhanced: string | null,
  permanent: boolean,
  retryAfter?: number,
): Classification {
  const base: Classification = {
    outcome,
    action: ACTION_BY_OUTCOME[outcome],
    permanent,
    code,
    enhanced,
    provider,
    rule,
  };
  return retryAfter === undefined ? base : { ...base, retryAfter };
}
