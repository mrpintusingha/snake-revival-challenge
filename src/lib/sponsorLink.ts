/**
 * Normalizes the claim form's "URL or @handle" input into a resolvable
 * https URL. A bare "@handle" (no protocol, no dot) is treated as an X/
 * Twitter handle and resolved to that profile; a bare domain gets https://
 * prepended; anything already prefixed with a protocol is left alone.
 * Used identically on the client (favicon/preview display) and the server
 * (validation, and what's actually stored as the sponsor's link) so an
 * @handle resolves to the same place everywhere instead of silently
 * producing a URL that goes nowhere (e.g. "https://@handle", which parses
 * as a valid but meaningless URL with no favicon, no preview, and no real
 * destination).
 */
export function normalizeSponsorLink(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("@")) {
    const handle = trimmed.slice(1).trim().replace(/^@+/, "");
    return handle ? `https://x.com/${handle}` : trimmed;
  }
  return `https://${trimmed}`;
}

/** Whether this input is plausible enough to attempt a favicon/preview fetch for. */
export function looksLikeSponsorLink(raw: string): boolean {
  const trimmed = raw.trim();
  if (trimmed.startsWith("@")) return trimmed.length > 1;
  return /\.[a-z]{2,}/i.test(trimmed);
}
