import { describe, expect, it } from "vitest";
import {
  EnvValidationError,
  blankToUndefined,
  parseClientEnv,
  parseServerEnv,
} from "@/lib/env/schema";

const validServer = {
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key-long-enough",
  SUPABASE_JWT_SECRET: "jwt-secret-long-enough-here",
  APP_URL: "https://zisriq.example",
  NODE_ENV: "production",
};

describe("blankToUndefined", () => {
  it("treats empty strings as absent so blank .env lines behave like missing ones", () => {
    expect(blankToUndefined({ A: "", B: "x", C: undefined })).toEqual({
      A: undefined,
      B: "x",
      C: undefined,
    });
  });
});

describe("parseClientEnv", () => {
  it("accepts a well-formed public config", () => {
    const env = parseClientEnv({
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-that-is-long-enough",
    });
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("http://127.0.0.1:54321");
  });

  it("rejects a non-URL Supabase URL", () => {
    expect(() =>
      parseClientEnv({
        NEXT_PUBLIC_SUPABASE_URL: "127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-that-is-long-enough",
      }),
    ).toThrow(EnvValidationError);
  });
});

describe("parseServerEnv", () => {
  it("accepts a minimal valid server config and defaults optional secrets to undefined", () => {
    const env = parseServerEnv({ ...validServer, RESEND_API_KEY: "" });
    expect(env.APP_URL).toBe("https://zisriq.example");
    expect(env.RESEND_API_KEY).toBeUndefined();
  });

  it("rejects APP_URL with a trailing slash, which would produce '//p/<token>' portal links", () => {
    expect(() => parseServerEnv({ ...validServer, APP_URL: "https://zisriq.example/" })).toThrow(
      /trailing slash/,
    );
  });

  it("rejects a missing service role key", () => {
    const { SUPABASE_SERVICE_ROLE_KEY: _omitted, ...rest } = validServer;
    expect(() => parseServerEnv(rest)).toThrow(EnvValidationError);
  });

  it("rejects a CRON_SECRET that is too short to be worth having", () => {
    expect(() => parseServerEnv({ ...validServer, CRON_SECRET: "short" })).toThrow(
      EnvValidationError,
    );
  });

  it("names the offending variable in the error message", () => {
    expect(() => parseServerEnv({ ...validServer, APP_URL: "nope" })).toThrow(/APP_URL/);
  });
});
