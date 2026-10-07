# smtp-outcome

Classify SMTP responses and delivery status notifications into normalised
delivery outcomes, and decide what to do with the recipient next.

Every sending system eventually writes this code, usually as a growing pile of
string matches inside a retry loop. This is that code, extracted, documented,
and tested against a corpus you can add to.

```ts
import { classify, nextRetry } from "smtp-outcome";

const result = classify({
  response: "421 4.7.0 Try again later, closing connection",
  recipient: "someone@gmail.com",
});
// {
//   outcome: "rate_limited",
//   action: "defer",
//   permanent: false,
//   code: 421,
//   enhanced: "4.7.0",
//   provider: "google",
//   rule: "google.rate-limited",
//   retryAfter: 1800
// }

nextRetry(result, { attempt: 2, queueDepth: 40_000 });
// { retry: true, delaySeconds: 3600, reason: "rate_limited after attempt 2" }
```

## What it does

**Classifies** a response into one of nine outcomes: `invalid_recipient`,
`hard_bounce`, `soft_bounce`, `deferred`, `rate_limited`, `policy_block`,
`auth_failure`, `spam_block`, `unknown`.

**Recommends an action**: `suppress`, `retry`, `defer` or `review`. Most
senders only ever need these four, and collapsing the outcome into one of them
is where the judgement lives.

**Decides the next attempt**, honouring what the receiver asked for and
widening the gap when the queue for that destination is already deep.

**Reads DSNs** (RFC 3464) as well as bare SMTP responses.

## How it decides

Resolution runs in order of how much the source can be trusted:

1. **A provider rule**, when the recipient domain or the response names a
   known receiver. A receiver's own wording is more precise than the status
   code it chose to attach.
2. **The enhanced status code** (RFC 3463, extended by RFC 7372 for
   authentication and RFC 7505 for null MX). Standardised, so trusted next.
3. **A generic text rule**, matched on wording common across receivers.
4. **The reply code class alone**, which at least says whether to try again.

Two refinements matter more than they look:

- **`X.7.1` does not outrank the text.** It is the catch-all policy code, and
  receivers attach it to spam blocks, authentication failures and reputation
  blocks alike. When the text says something more specific, the text wins.
- **A `4.x.x` never resolves to a permanent outcome.** Some subject codes map
  to "invalid recipient", but a transient class says to try again regardless,
  and a temporary lookup failure must not suppress a good address.

## Retry policy

`nextRetry` uses a quadratic curve rather than an exponential one. Early
attempts stay close enough together to clear a brief blip, and the curve still
opens out far enough that a long outage is not hammered.

Two things widen it beyond the attempt count:

- **A receiver that asked for a specific wait is obeyed**, not second-guessed.
- **Queue depth widens the gap**, sub-linearly. When a destination is already
  backed up, retrying sooner adds load to a system that has just told you it
  has none to spare. Sub-linear so that a large backlog does not push every
  message past its delivery window at once.

## Provider packs

Packs exist for Google, Microsoft, Yahoo and Apple. Every rule cites a public
source: an RFC, a published postmaster page, or the receiver's own documented
error reference.

They are starting points, not a complete map of any receiver's behaviour.
Receivers change wording without notice, so a provider rule is a refinement of
the generic result rather than the authority on it.

## Contributing

The most useful contribution is a real response string and the classification
it should produce. Add a case to `test/corpus.ts` and, if the current rules get
it wrong, the rule that fixes it with a source citation.

Rules without a citable source will not be merged. A rule that is right by
coincidence is worse than no rule, because it will be trusted later.

## Install

```sh
npm install smtp-outcome
```

Zero runtime dependencies. TypeScript types included.

## Licence

MIT.
