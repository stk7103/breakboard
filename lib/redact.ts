/**
 * Deterministic, regex-only PII scrubber for user-submitted bug logs.
 * No AI, no network, no randomness: the same input always yields the same output.
 *
 * Masks:
 *   - email addresses              -> [EMAIL]
 *   - UPI IDs (handle@psp)         -> [UPI_ID]
 *   - 12-digit Aadhaar / gov IDs   -> [GOV_ID]   (1234 5678 9012, 1234-5678-9012, 123456789012)
 *   - phone numbers with 10+ digits -> [PHONE]   (+91 98765 43210, (022) 2345-6789, 9876543210)
 *
 * Order matters: emails are masked before UPI IDs (both contain "@"; only emails
 * have a dotted domain), and 12-digit IDs before phones (a bare 12-digit number
 * would otherwise also qualify as a 10+ digit phone).
 */

/** name@domain.tld — requires a dotted domain ending in a 2+ letter TLD. */
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;

/**
 * handle@psp with no dotted domain (e.g. name@okhdfcbank, 9876543210@ybl).
 * Runs after EMAIL_RE, so anything left with "@" and no TLD is treated as UPI.
 */
const UPI_RE = /(?<![\w.-])[A-Za-z0-9][A-Za-z0-9._-]{1,255}@[A-Za-z][A-Za-z0-9]{1,63}(?![\w.@-])/g;

/**
 * Exactly 12 digits, optionally grouped 4-4-4 with a single space or hyphen.
 * Must not be part of a longer digit run or follow a "+" (that's a phone).
 */
const GOV_ID_RE = /(?<![\w+]|\d[ -])\d{4}[ -]?\d{4}[ -]?\d{4}(?![ -]?\d|\w)/g;

/**
 * Candidate phone: optional +country code, optional (area code), then digits
 * separated by at most one space or hyphen. The digit count (>= 10) is checked
 * in the replacer. A trailing ":" is excluded so "2026-11-15 10:30" isn't a phone.
 */
const PHONE_CANDIDATE_RE = /(?<![\w+])(?:\+\d{1,3}[ -]?)?(?:\(\d{1,5}\)[ -]?)?\d(?:[ -]?\d)+(?![\w:])/g;

const MIN_PHONE_DIGITS = 10;

function countDigits(s: string): number {
  let n = 0;
  for (const ch of s) if (ch >= "0" && ch <= "9") n++;
  return n;
}

export function redactText(text: string): string {
  if (!text) return text;

  return text
    .replace(EMAIL_RE, "[EMAIL]")
    .replace(UPI_RE, "[UPI_ID]")
    .replace(GOV_ID_RE, "[GOV_ID]")
    .replace(PHONE_CANDIDATE_RE, (match) =>
      countDigits(match) >= MIN_PHONE_DIGITS ? "[PHONE]" : match,
    );
}
