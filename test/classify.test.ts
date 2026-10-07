import { test } from "node:test";
import assert from "node:assert/strict";
import { classify, classifyDsn, nextRetry, parseDsn } from "../src/index.ts";
import { corpus } from "./corpus.ts";

test("corpus classifies as expected", () => {
  const failures: string[] = [];
  for (const c of corpus) {
    const got = classify({ response: c.response, recipient: c.recipient });
    if (got.outcome !== c.outcome) {
      failures.push(`${c.note}\n  response: ${c.response}\n  expected: ${c.outcome}\n  got:      ${got.outcome} (rule ${got.rule})`);
    }
  }
  assert.equal(failures.length, 0, `\n${failures.join("\n\n")}`);
});

test("permanent flag follows the reply class", () => {
  assert.equal(classify({ response: "550 5.1.1 User unknown" }).permanent, true);
  assert.equal(classify({ response: "451 4.4.1 No answer" }).permanent, false);
});

test("suppress never retries", () => {
  const c = classify({ response: "550 5.1.1 User unknown" });
  const d = nextRetry(c, { attempt: 0 });
  assert.equal(d.retry, false);
  assert.equal(d.delaySeconds, 0);
});

test("retry delay grows with attempt and with queue depth", () => {
  const c = classify({ response: "451 4.4.1 No answer from host" });
  const a = nextRetry(c, { attempt: 1 });
  const b = nextRetry(c, { attempt: 4 });
  assert.ok(b.delaySeconds > a.delaySeconds, "later attempts wait longer");

  const shallow = nextRetry(c, { attempt: 2, queueDepth: 10 });
  const deep = nextRetry(c, { attempt: 2, queueDepth: 100_000 });
  assert.ok(deep.delaySeconds > shallow.delaySeconds, "a deeper queue waits longer");
});

test("a receiver's requested wait is respected", () => {
  const c = classify({ response: "421 4.7.0 [TS03] temporarily deferred", recipient: "x@yahoo.com" });
  const d = nextRetry(c, { attempt: 0 });
  assert.ok(d.delaySeconds >= 1800, `expected at least the provider retryAfter, got ${d.delaySeconds}`);
});

test("attempts and age both stop delivery", () => {
  const c = classify({ response: "451 4.4.1 No answer" });
  assert.equal(nextRetry(c, { attempt: 12, maxAttempts: 12 }).retry, false);
  assert.equal(nextRetry(c, { attempt: 2, ageSeconds: 400_000, maxAgeSeconds: 345_600 }).retry, false);
});

test("DSN parsing and classification", () => {
  const body = [
    "Final-Recipient: rfc822; someone@gmail.com",
    "Action: failed",
    "Status: 5.1.1",
    "Diagnostic-Code: smtp; 550 5.1.1 The email account that you tried to reach does not exist",
  ].join("\n");
  const fields = parseDsn(body);
  assert.equal(fields.recipient, "someone@gmail.com");
  assert.equal(fields.status, "5.1.1");
  const c = classifyDsn(body);
  assert.equal(c.outcome, "invalid_recipient");
  assert.equal(c.action, "suppress");
});
