/**
 * Portal tokens — the product's most exposed surface.
 *
 * A portal link is the ONLY credential a client presents, and resolving it runs
 * with the service role because there is no Supabase session to carry. RLS is
 * therefore not protecting these paths; the scoping in the service is. That
 * makes these assertions load-bearing in a way most tests are not.
 */
import { beforeAll, describe, expect, it } from "vitest";

import { SEED, serviceRoleClient, supabaseIsReachable } from "./helpers/supabase";
import { hashToken, issuePortalToken, resolvePortalToken } from "@/server/services/portal-tokens";
import { itemBelongsToScope, loadPortalView } from "@/server/services/portal-view";

const admin = serviceRoleClient();

let firmAToken: string;

beforeAll(async () => {
  if (!(await supabaseIsReachable())) {
    throw new Error("Local Supabase is not reachable. Run `npm run db:start` first.");
  }

  const issued = await issuePortalToken({
    firmId: SEED.firmA.id,
    requestId: SEED.firmA.requestId,
    createdBy: SEED.firmA.admin.id,
    ttlDays: 30,
  });
  firmAToken = issued.token;
});

describe("issuing", () => {
  it("returns a high-entropy token", () => {
    // 32 random bytes, base64url. Short enough to paste, long enough that
    // guessing is not a threat model.
    expect(firmAToken.length).toBeGreaterThanOrEqual(40);
    expect(firmAToken).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("never stores the plaintext", async () => {
    const { data } = await admin
      .from("portal_tokens")
      .select("token_hash")
      .eq("request_id", SEED.firmA.requestId)
      .is("revoked_at", null)
      .single();

    const stored = String(data?.token_hash ?? "");
    expect(stored).not.toContain(firmAToken);
    // bytea comes back hex-escaped; it must equal the sha256 of the token.
    expect(stored.replace(/^\\x/, "")).toBe(hashToken(firmAToken).toString("hex"));
  });

  it("revokes the previous link when a new one is issued", async () => {
    const previous = firmAToken;

    const reissued = await issuePortalToken({
      firmId: SEED.firmA.id,
      requestId: SEED.firmA.requestId,
      createdBy: SEED.firmA.admin.id,
      ttlDays: 30,
    });

    // A firm reissuing "because the old link leaked" must actually kill it.
    expect(await resolvePortalToken(previous)).toBeNull();
    expect(await resolvePortalToken(reissued.token)).not.toBeNull();

    firmAToken = reissued.token;
  });
});

describe("resolving", () => {
  it("scopes to exactly one request", async () => {
    const scope = await resolvePortalToken(firmAToken);
    expect(scope).not.toBeNull();
    expect(scope!.requestId).toBe(SEED.firmA.requestId);
    expect(scope!.firmId).toBe(SEED.firmA.id);
  });

  it("rejects an unknown token", async () => {
    expect(await resolvePortalToken("not-a-real-token-but-long-enough-to-pass")).toBeNull();
  });

  it("rejects a short or empty token without touching the database", async () => {
    expect(await resolvePortalToken("")).toBeNull();
    expect(await resolvePortalToken("abc")).toBeNull();
  });

  it("rejects an expired token", async () => {
    const issued = await issuePortalToken({
      firmId: SEED.firmB.id,
      requestId: SEED.firmB.requestId,
      createdBy: SEED.firmB.admin.id,
      ttlDays: 30,
    });

    await admin
      .from("portal_tokens")
      .update({ expires_at: new Date(Date.now() - 1000).toISOString() })
      .eq("request_id", SEED.firmB.requestId)
      .is("revoked_at", null);

    expect(await resolvePortalToken(issued.token)).toBeNull();
  });
});

describe("the portal view", () => {
  it("shows only the request the token grants", async () => {
    const view = await loadPortalView(firmAToken);
    expect(view).not.toBeNull();
    expect(view!.firmName).toBe(SEED.firmA.name);
    expect(view!.items.length).toBeGreaterThan(0);
  });

  it("leaks nothing about other firms", async () => {
    const view = await loadPortalView(firmAToken);
    const serialised = JSON.stringify(view);

    // The service role could read everything; the query must not have.
    expect(serialised).not.toContain(SEED.firmB.id);
    expect(serialised).not.toContain(SEED.firmB.name);
  });

  it("refuses an item from another firm's request", async () => {
    const scope = await resolvePortalToken(firmAToken);

    const { data: foreignItem } = await admin
      .from("request_items")
      .select("id")
      .eq("request_id", SEED.firmB.requestId)
      .limit(1)
      .single();

    // The item id arrives from the browser. Without this check, one valid token
    // would authorise uploads into any request in the database.
    expect(await itemBelongsToScope(foreignItem!.id, scope!)).toBe(false);
  });

  it("accepts an item that does belong to the request", async () => {
    const scope = await resolvePortalToken(firmAToken);

    const { data: ownItem } = await admin
      .from("request_items")
      .select("id")
      .eq("request_id", SEED.firmA.requestId)
      .limit(1)
      .single();

    expect(await itemBelongsToScope(ownItem!.id, scope!)).toBe(true);
  });

  it("stops serving a cancelled request even with a live link", async () => {
    // Creates its own request rather than cancelling a seeded one. Mutating
    // shared fixtures makes a suite pass once and fail on every rerun, which is
    // worse than no test at all.
    const { data: created } = await admin
      .from("requests")
      .insert({
        firm_id: SEED.firmA.id,
        client_id: SEED.firmA.clientId,
        title: "Cancellation probe",
        period_label: "probe",
        status: "awaiting_client",
        sent_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    const probeId = created!.id as string;

    await admin.from("request_items").insert({
      firm_id: SEED.firmA.id,
      request_id: probeId,
      label: "Probe item",
      sort_order: 0,
    });

    const issued = await issuePortalToken({
      firmId: SEED.firmA.id,
      requestId: probeId,
      createdBy: SEED.firmA.admin.id,
      ttlDays: 30,
    });

    expect(await loadPortalView(issued.token)).not.toBeNull();

    await admin
      .from("requests")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", probeId);

    // A live link must stop working the moment the firm cancels the request.
    expect(await loadPortalView(issued.token)).toBeNull();

    await admin.from("requests").delete().eq("id", probeId);
  });
});
