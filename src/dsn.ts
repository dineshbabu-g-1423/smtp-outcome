/**
 * Minimal extraction of the fields that matter from a delivery status
 * notification, RFC 3464. Only the per-recipient part is read, because that
 * is where the receiver's verdict lives.
 */
export interface DsnFields {
  status: string | null;
  action: string | null;
  diagnostic: string | null;
  recipient: string | null;
}

export function parseDsn(body: string): DsnFields {
  const field = (name: string): string | null => {
    const re = new RegExp(`^${name}:\\s*(.+)$`, "im");
    const m = body.match(re);
    return m && m[1] ? m[1].trim() : null;
  };
  const diagnostic = field("Diagnostic-Code");
  return {
    status: field("Status"),
    action: field("Action"),
    // Diagnostic-Code is "type; text" — the text is what receivers vary.
    diagnostic: diagnostic ? diagnostic.replace(/^smtp;\s*/i, "") : null,
    recipient: field("Final-Recipient")?.replace(/^rfc822;\s*/i, "") ?? null,
  };
}
