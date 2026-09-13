/**
 * Cross-tenant isolation — the Phase 1 gate.
 *
 * Signs in as a real user in Firm A and proves, for EVERY table carrying a
 * firm_id, that Firm B's rows cannot be read, updated, deleted, or forged.
 *
 * The manifest below is cross-checked against the database catalog, so adding a
 * table without adding it here (and without RLS) fails this suite rather than
 * slipping through. See DECISIONS.md D-003 for why this is Vitest and not
 * Playwright.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SEED, serviceRoleClient, signIn, supabaseIsReachable } from "./helpers/supabase";

/**
 * Every table that carries firm_id. `insertProbe` builds a row that belongs to
 * Firm B; for tables whose firm_id is set by a trigger from a parent, the probe
 * points at a Firm B parent instead, which is the realistic attack.
 */
type TableProbe = {
  table: string;
  /** Id of a known Firm B row, resolved in beforeAll. */
  idOf: () => string | number;
  /** A harmless column to attempt to modify. */
  mutableColumn: string;
  mutableValue: unknown;
  /** A row that would belong to Firm B if the insert were permitted. */
  insertProbe: () => Record<string, unknown>;
};

const firmBIds: Record<string, string | number> = {};

const PROBES: TableProbe[] = [
  {
    table: "clients",
    idOf: () => SEED.firmB.clientId,
    mutableColumn: "notes",
    mutableValue: "tampered by firm A",
    insertProbe: () => ({
      firm_id: SEED.firmB.id,
      name: "Injected Client",
      type: "company",
    }),
  },
  {
    table: "checklist_templates",
    idOf: () => SEED.firmB.templateId,
    mutableColumn: "description",
    mutableValue: "tampered by firm A",
    insertProbe: () => ({ firm_id: SEED.firmB.id, name: "Injected Template" }),
  },
  {
    table: "checklist_template_items",
    idOf: () => firmBIds.checklist_template_items!,
    mutableColumn: "label",
    mutableValue: "tampered by firm A",
    insertProbe: () => ({
      firm_id: SEED.firmB.id,
      template_id: SEED.firmB.templateId,
      label: "Injected Item",
    }),
  },
  {
    table: "requests",
    idOf: () => SEED.firmB.requestId,
    mutableColumn: "title",
    mutableValue: "tampered by firm A",
    insertProbe: () => ({
      firm_id: SEED.firmB.id,
      client_id: SEED.firmB.clientId,
      title: "Injected Request",
      period_label: "Aug 2026",
    }),
  },
  {
    table: "request_items",
    idOf: () => firmBIds.request_items!,
    mutableColumn: "label",
    mutableValue: "tampered by firm A",
    insertProbe: () => ({
      firm_id: SEED.firmB.id,
      request_id: SEED.firmB.requestId,
      label: "Injected Item",
    }),
  },
  {
    table: "portal_tokens",
    idOf: () => firmBIds.portal_tokens!,
    mutableColumn: "expires_at",
    mutableValue: "2030-01-01T00:00:00Z",
    insertProbe: () => ({
      firm_id: SEED.firmB.id,
      request_id: SEED.firmB.requestId,
      token_hash: "\\xdeadbeef",
      expires_at: "2030-01-01T00:00:00Z",
    }),
  },
  {
    table: "documents",
    idOf: () => firmBIds.documents!,
    mutableColumn: "reviewer_notes",
    mutableValue: "tampered by firm A",
    insertProbe: () => ({
      firm_id: SEED.firmB.id,
      request_item_id: firmBIds.request_items,
      storage_path: `${SEED.firmB.id}/injected/${Date.now()}.pdf`,
      original_filename: "injected.pdf",
      mime_type: "application/pdf",
      size_bytes: 1024,
      uploaded_by_user: SEED.firmA.admin.id,
    }),
  },
  {
    table: "reminders",
    idOf: () => firmBIds.reminders!,
    mutableColumn: "status",
    mutableValue: "failed",
    insertProbe: () => ({
      firm_id: SEED.firmB.id,
      request_id: SEED.firmB.requestId,
      type: "follow_up",
      sequence_no: 99,
      scheduled_for: "2030-01-01",
    }),
  },
  {
    table: "activity_events",
    idOf: () => firmBIds.activity_events!,
    mutableColumn: "verb",
    mutableValue: "tampered",
    insertProbe: () => ({
      firm_id: SEED.firmB.id,
      verb: "injected.event",
      target_type: "request",
      target_id: SEED.firmB.requestId,
    }),
  },
  {
    table: "memberships",
    idOf: () => firmBIds.memberships!,
    mutableColumn: "role",
    mutableValue: "admin",
    insertProbe: () => ({
      firm_id: SEED.firmB.id,
      user_id: SEED.firmA.admin.id,
      role: "admin",
    }),
  },
  {
    table: "invites",
    idOf: () => firmBIds.invites!,
    mutableColumn: "role",
    mutableValue: "admin",
    insertProbe: () => ({
      firm_id: SEED.firmB.id,
      email: "attacker@example.com",
      role: "admin",
      token_hash: "\\xcafebabe",
      expires_at: "2030-01-01T00:00:00Z",
    }),
  },
];

let firmAAdmin: SupabaseClient;
let firmAStaff: SupabaseClient;
let admin: SupabaseClient;

beforeAll(async () => {
  if (!(await supabaseIsReachable())) {
    throw new Error(
      "Local Supabase is not reachable. Run `npm run db:start` and `npm run db:reset` first.",
    );
  }

  admin = serviceRoleClient();

  // Resolve or create one Firm B row per table, so every probe has a real target.
  const pick = async (table: string, column = "firm_id") => {
    const { data, error } = await admin
      .from(table)
      .select("id")
      .eq(column, SEED.firmB.id)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`fixture lookup failed for ${table}: ${error.message}`);
    return data?.id as string | number | undefined;
  };

  firmBIds.checklist_template_items = (await pick("checklist_template_items"))!;
  firmBIds.request_items = (await pick("request_items"))!;
  firmBIds.portal_tokens = (await pick("portal_tokens"))!;
  firmBIds.memberships = (await pick("memberships"))!;
  firmBIds.activity_events = (await pick("activity_events"))!;

  // Not seeded — create minimal fixtures so the probes are meaningful.
  const { data: doc, error: docError } = await admin
    .from("documents")
    .insert({
      firm_id: SEED.firmB.id,
      request_item_id: firmBIds.request_items,
      storage_path: `${SEED.firmB.id}/fixture/${Date.now()}.pdf`,
      original_filename: "firm-b-fixture.pdf",
      mime_type: "application/pdf",
      size_bytes: 2048,
      uploaded_by_user: SEED.firmB.admin.id,
    })
    .select("id")
    .single();
  if (docError) throw new Error(`document fixture failed: ${docError.message}`);
  firmBIds.documents = doc.id;

  const { data: reminder, error: reminderError } = await admin
    .from("reminders")
    .insert({
      firm_id: SEED.firmB.id,
      request_id: SEED.firmB.requestId,
      type: "follow_up",
      sequence_no: 1,
      scheduled_for: "2026-09-01",
    })
    .select("id")
    .single();
  if (reminderError) throw new Error(`reminder fixture failed: ${reminderError.message}`);
  firmBIds.reminders = reminder.id;

  const { data: invite, error: inviteError } = await admin
    .from("invites")
    .insert({
      firm_id: SEED.firmB.id,
      email: "fixture@iyervenkat.example",
      role: "staff",
      token_hash: `\\x${Date.now().toString(16).padStart(16, "0")}`,
      expires_at: "2030-01-01T00:00:00Z",
    })
    .select("id")
    .single();
  if (inviteError) throw new Error(`invite fixture failed: ${inviteError.message}`);
  firmBIds.invites = invite.id;

  firmAAdmin = await signIn(SEED.firmA.admin.email);
  firmAStaff = await signIn(SEED.firmA.staff.email);
});

afterAll(async () => {
  if (!admin) return;
  if (firmBIds.documents) await admin.from("documents").delete().eq("id", firmBIds.documents);
  if (firmBIds.reminders) await admin.from("reminders").delete().eq("id", firmBIds.reminders);
  if (firmBIds.invites) await admin.from("invites").delete().eq("id", firmBIds.invites);
});

describe("the manifest covers every firm-scoped table", () => {
  it("has a probe for every table carrying firm_id", async () => {
    const { data, error } = await admin.rpc("security_audit_tables");
    expect(error).toBeNull();

    const firmScoped = (data as { table_name: string; has_firm_id: boolean }[])
      .filter((t) => t.has_firm_id)
      .map((t) => t.table_name)
      .sort();

    const covered = PROBES.map((p) => p.table).sort();

    // If this fails, a table was added without a cross-tenant probe. Add one.
    expect(covered).toEqual(firmScoped);
  });

  it("has RLS enabled on every table in public, without exception", async () => {
    const { data } = await admin.rpc("security_audit_tables");
    const unprotected = (data as { table_name: string; rls_enabled: boolean }[])
      .filter((t) => !t.rls_enabled)
      .map((t) => t.table_name);

    expect(unprotected).toEqual([]);
  });

  it("keeps activity_events append-only: no update or delete policy exists", async () => {
    const { data } = await admin.rpc("security_audit_tables");
    const audit = (
      data as { table_name: string; update_policies: number; delete_policies: number }[]
    ).find((t) => t.table_name === "activity_events");

    expect(audit).toBeDefined();
    expect(audit!.update_policies).toBe(0);
    expect(audit!.delete_policies).toBe(0);
  });
});

describe.each(PROBES)("firm A cannot reach firm B's $table", (probe) => {
  it("cannot SELECT the row", async () => {
    const { data, error } = await firmAAdmin.from(probe.table).select("*").eq("id", probe.idOf());

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("cannot SELECT any row belonging to firm B", async () => {
    const { data } = await firmAAdmin.from(probe.table).select("id").eq("firm_id", SEED.firmB.id);
    expect(data ?? []).toEqual([]);
  });

  it("cannot UPDATE the row", async () => {
    const readColumn = async () => {
      const { data } = await admin
        .from(probe.table)
        .select(probe.mutableColumn)
        .eq("id", probe.idOf())
        .single();
      return (data as unknown as Record<string, unknown>)[probe.mutableColumn];
    };

    // Compare before against after, rather than against the value we tried to
    // write. Asserting "not equal to the attempted value" gives a false failure
    // whenever the row already happens to hold it — which is exactly what
    // memberships.role = 'admin' did.
    const before = await readColumn();

    const { data, error } = await firmAAdmin
      .from(probe.table)
      .update({ [probe.mutableColumn]: probe.mutableValue })
      .eq("id", probe.idOf())
      .select();

    // Either RLS rejects outright, or it filters the row out — both are correct.
    if (!error) expect(data).toEqual([]);

    expect(await readColumn()).toEqual(before);
  });

  it("cannot DELETE the row", async () => {
    const { data, error } = await firmAAdmin
      .from(probe.table)
      .delete()
      .eq("id", probe.idOf())
      .select();

    if (!error) expect(data).toEqual([]);

    const { count } = await admin
      .from(probe.table)
      .select("id", { count: "exact", head: true })
      .eq("id", probe.idOf());

    expect(count).toBe(1);
  });

  it("cannot INSERT a row into firm B", async () => {
    const { error } = await firmAAdmin.from(probe.table).insert(probe.insertProbe()).select();
    expect(error).not.toBeNull();
  });
});

describe("firm A sees its own data, so the tests above are not vacuous", () => {
  it("reads its own clients", async () => {
    const { data, error } = await firmAAdmin.from("clients").select("id, name");
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it("reads its own requests", async () => {
    const { data } = await firmAAdmin.from("requests").select("id").eq("firm_id", SEED.firmA.id);
    expect(data!.length).toBeGreaterThan(0);
  });

  it("cannot see firm B's firm row but can see its own", async () => {
    const { data } = await firmAAdmin.from("firms").select("id, name");
    const ids = (data ?? []).map((f) => f.id);
    expect(ids).toContain(SEED.firmA.id);
    expect(ids).not.toContain(SEED.firmB.id);
  });
});

describe("role scoping within a firm", () => {
  it("staff see only requests assigned to them", async () => {
    const { data } = await firmAStaff.from("requests").select("id, assigned_to");

    expect(data!.length).toBeGreaterThan(0);
    for (const row of data!) {
      expect(row.assigned_to).toBe(SEED.firmA.staff.id);
    }
  });

  it("staff cannot read a request assigned to someone else", async () => {
    const { data } = await firmAStaff
      .from("requests")
      .select("id")
      .eq("id", SEED.firmA.requestNotAssignedToStaff);

    expect(data).toEqual([]);
  });

  it("staff can still read the firm's clients, which they need for context", async () => {
    const { data, error } = await firmAStaff.from("clients").select("id");
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it("staff cannot create a client", async () => {
    const { error } = await firmAStaff
      .from("clients")
      .insert({ firm_id: SEED.firmA.id, name: "Staff Created", type: "individual" })
      .select();

    expect(error).not.toBeNull();
  });

  it("staff cannot create a request", async () => {
    const { error } = await firmAStaff
      .from("requests")
      .insert({
        firm_id: SEED.firmA.id,
        client_id: SEED.firmA.clientId,
        title: "Staff Created",
        period_label: "Sep 2026",
      })
      .select();

    expect(error).not.toBeNull();
  });
});

describe("anonymous callers get nothing without a portal token", () => {
  it("reads no rows from any firm-scoped table", async () => {
    const { anonClient } = await import("./helpers/supabase");
    const anon = anonClient();

    for (const probe of PROBES) {
      const { data } = await anon.from(probe.table).select("id").limit(1);
      expect(data ?? []).toEqual([]);
    }
  });

  it("cannot read the portal_tokens table, which would leak every live link", async () => {
    const { anonClient } = await import("./helpers/supabase");
    const anon = anonClient();
    const { data } = await anon.from("portal_tokens").select("token_hash").limit(1);
    expect(data ?? []).toEqual([]);
  });
});
