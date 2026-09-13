import { describe, expect, it } from "vitest";
import {
  GSTIN_REGEX,
  PAN_REGEX,
  gstinCheckDigit,
  isValidGstin,
  isValidPan,
  normaliseGstin,
  normalisePan,
  panFromGstin,
} from "@/lib/validation/india";

describe("PAN", () => {
  it("accepts well-formed PANs across holder types", () => {
    for (const pan of ["AABCK1429P", "AADFR8821L", "ABLPS4417Q", "AKQPN3382F"]) {
      expect(isValidPan(pan)).toBe(true);
    }
  });

  it("normalises case and stray whitespace before validating", () => {
    expect(normalisePan("  aabck1429p ")).toBe("AABCK1429P");
    expect(isValidPan(" aabck1429p ")).toBe(true);
  });

  it("rejects the usual malformed shapes", () => {
    for (const bad of [
      "AABCK1429", // too short
      "AABCK1429PP", // too long
      "AABC11429P", // digit in the letter block
      "AABCKI429P", // letter in the digit block
      "AABCK14291", // digit as the final check letter
      "",
    ]) {
      expect(isValidPan(bad)).toBe(false);
    }
  });

  it("does not infer anything from the holder-type character (D-006)", () => {
    // A proprietorship legitimately files under an individual 'P' PAN, so the
    // 4th character must never be used to reject a value.
    expect(isValidPan("ABLPS4417Q")).toBe(true); // P = individual
    expect(isValidPan("AABCK1429P")).toBe(true); // C = company
    expect(isValidPan("AADFR8821L")).toBe(true); // F = firm
  });

  it("has a regex consistent with the validator", () => {
    expect(PAN_REGEX.test("AABCK1429P")).toBe(true);
    expect(PAN_REGEX.test("aabck1429p")).toBe(false); // regex is case-sensitive by design
  });
});

describe("GSTIN check digit", () => {
  it("computes the documented check digit for known-good values", () => {
    expect(gstinCheckDigit("27AABCK1429P1Z")).toBe("9");
    expect(gstinCheckDigit("33AAECV5567K1Z")).toBe("X");
    expect(gstinCheckDigit("27AADFR8821L1Z")).toBe("S");
  });

  it("refuses input of the wrong length", () => {
    expect(() => gstinCheckDigit("27AABCK1429P1")).toThrow(/14 characters/);
    expect(() => gstinCheckDigit("27AABCK1429P1ZZ")).toThrow(/14 characters/);
  });

  it("refuses characters outside the mod-36 alphabet", () => {
    expect(() => gstinCheckDigit("27AABCK1429P1-")).toThrow(/invalid GSTIN character/);
  });
});

describe("GSTIN", () => {
  const valid = [
    "27AABCK1429P1Z9",
    "27AADFR8821L1ZS",
    "27ABLPS4417Q1ZU",
    "33AAECV5567K1ZX",
    "33AAJFM2290R1ZR",
    "33AKQPI7712B1ZE",
    "33AACCS3318N1ZB",
  ];

  it("accepts structurally valid GSTINs with correct check digits", () => {
    for (const gstin of valid) expect(isValidGstin(gstin)).toBe(true);
  });

  it("normalises case and whitespace", () => {
    expect(normaliseGstin(" 27aabck1429p1z9 ")).toBe("27AABCK1429P1Z9");
    expect(isValidGstin(" 27aabck1429p1z9 ")).toBe(true);
  });

  it("rejects a GSTIN whose check digit is wrong", () => {
    // Same value, last character bumped.
    expect(isValidGstin("27AABCK1429P1Z8")).toBe(false);
  });

  it("rejects an invalid state code even when the rest is well formed", () => {
    expect(isValidGstin("00AABCK1429P1Z9")).toBe(false);
    expect(isValidGstin("50AABCK1429P1Z9")).toBe(false);
  });

  it("rejects values missing the fixed 'Z' in position 14", () => {
    expect(GSTIN_REGEX.test("27AABCK1429P1Y9")).toBe(false);
  });

  it("rejects the wrong length", () => {
    expect(isValidGstin("27AABCK1429P1Z")).toBe(false);
    expect(isValidGstin("27AABCK1429P1Z99")).toBe(false);
  });

  it("extracts the embedded PAN", () => {
    expect(panFromGstin("27AABCK1429P1Z9")).toBe("AABCK1429P");
    expect(panFromGstin("nonsense")).toBeNull();
  });

  it("extracts a PAN that itself validates", () => {
    for (const gstin of valid) {
      const pan = panFromGstin(gstin);
      expect(pan).not.toBeNull();
      expect(isValidPan(pan!)).toBe(true);
    }
  });
});
