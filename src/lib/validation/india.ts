/**
 * India-specific identifier validation.
 *
 * Format only, plus the GSTIN check digit. We deliberately do NOT cross-validate
 * PAN's holder-type character against the client's `type`: a proprietorship
 * files under the proprietor's individual 'P' PAN, so that check would reject
 * legitimate data. See DECISIONS.md D-006.
 */

/** Five letters, four digits, one letter. e.g. AABCS1429P */
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/**
 * Two-digit state code, the entity's PAN, an entity number, 'Z', check digit.
 * e.g. 27AABCS1429P1ZK
 */
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;

/** Valid GST state codes (01-38, plus 97 Other Territory and 99 Centre Jurisdiction). */
const VALID_STATE_CODES = new Set<string>([
  ...Array.from({ length: 38 }, (_, i) => String(i + 1).padStart(2, "0")),
  "97",
  "99",
]);

const GSTIN_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function normalisePan(input: string): string {
  return input.trim().toUpperCase().replace(/\s/g, "");
}

export function normaliseGstin(input: string): string {
  return input.trim().toUpperCase().replace(/\s/g, "");
}

export function isValidPan(input: string): boolean {
  return PAN_REGEX.test(normalisePan(input));
}

/**
 * GSTIN check digit, mod-36.
 *
 * Each of the first 14 characters is converted to its value in the alphabet
 * above and multiplied by an alternating factor of 1 and 2. Each product is
 * folded (quotient + remainder of division by 36) and summed; the check digit is
 * whatever brings the total to the next multiple of 36.
 */
export function gstinCheckDigit(first14: string): string {
  if (first14.length !== 14) {
    throw new Error(`gstinCheckDigit expects 14 characters, got ${first14.length}`);
  }

  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const value = GSTIN_ALPHABET.indexOf(first14[i]!);
    if (value === -1) throw new Error(`invalid GSTIN character at position ${i}: ${first14[i]}`);

    const factor = i % 2 === 0 ? 1 : 2;
    const product = value * factor;
    sum += Math.floor(product / 36) + (product % 36);
  }

  const checkValue = (36 - (sum % 36)) % 36;
  return GSTIN_ALPHABET[checkValue]!;
}

export function isValidGstin(input: string): boolean {
  const gstin = normaliseGstin(input);
  if (!GSTIN_REGEX.test(gstin)) return false;
  if (!VALID_STATE_CODES.has(gstin.slice(0, 2))) return false;
  return gstinCheckDigit(gstin.slice(0, 14)) === gstin[14];
}

/**
 * The PAN embedded in a GSTIN (characters 3-12). Useful for flagging a GSTIN
 * that does not match the PAN recorded against the same client — a warning for
 * the user, never a hard rejection.
 */
export function panFromGstin(input: string): string | null {
  const gstin = normaliseGstin(input);
  if (!GSTIN_REGEX.test(gstin)) return null;
  return gstin.slice(2, 12);
}
