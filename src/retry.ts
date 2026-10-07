import type { Classification } from "./types.ts";

export interface RetryPolicy {
  /** Attempts already made for this recipient, not counting the next one. */
  attempt: number;
  /** Give up after this many attempts. */
  maxAttempts?: number;
  /** Give up this many seconds after the first attempt. */
  maxAgeSeconds?: number;
  /** Seconds since the first attempt. */
  ageSeconds?: number;
  /** Current depth of the queue for this destination, if known. */
  queueDepth?: number;
}

export interface RetryDecision {
  retry: boolean;
  /** Seconds to wait before the next attempt. Zero when not retrying. */
  delaySeconds: number;
  reason: string;
}

const BASE_DELAY = 60;
const MAX_DELAY = 6 * 60 * 60;

/**
 * Decide whether and when to try again.
 *
 * Two things shape the delay beyond the attempt count. A receiver that asked
 * for a specific wait is obeyed rather than second-guessed. And a deep queue
 * widens the gap: when a destination is already backed up, retrying sooner
 * adds load to a system that is telling you it has none to spare.
 */
export function nextRetry(c: Classification, policy: RetryPolicy): RetryDecision {
  if (c.action === "suppress") {
    return { retry: false, delaySeconds: 0, reason: `permanent: ${c.outcome}` };
  }
  const maxAttempts = policy.maxAttempts ?? 12;
  if (policy.attempt >= maxAttempts) {
    return { retry: false, delaySeconds: 0, reason: `attempts exhausted (${maxAttempts})` };
  }
  if (
    policy.maxAgeSeconds !== undefined &&
    policy.ageSeconds !== undefined &&
    policy.ageSeconds >= policy.maxAgeSeconds
  ) {
    return { retry: false, delaySeconds: 0, reason: "delivery window expired" };
  }

  // Quadratic rather than exponential: the early attempts stay close enough
  // to clear a brief blip, and the curve still opens out far enough that a
  // long outage is not hammered.
  let delay = BASE_DELAY * Math.pow(policy.attempt + 1, 2);

  if (c.retryAfter !== undefined) {
    delay = Math.max(delay, c.retryAfter);
  }
  if (c.outcome === "rate_limited" || c.outcome === "policy_block") {
    delay *= 2;
  }
  if (policy.queueDepth !== undefined && policy.queueDepth > 0) {
    // Widen with the backlog, but sub-linearly, so a large queue does not
    // push every message beyond its delivery window at once.
    delay *= 1 + Math.log10(policy.queueDepth + 1) / 2;
  }

  return {
    retry: true,
    delaySeconds: Math.min(Math.round(delay), MAX_DELAY),
    reason: `${c.outcome} after attempt ${policy.attempt}`,
  };
}
