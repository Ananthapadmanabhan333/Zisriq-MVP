/**
 * Onboarding: a brand-new user signs up and creates their firm.
 *
 * This is the one write RLS cannot express — at the moment of the insert the
 * caller belongs to no firm, so the policies that scope every other table have
 * nothing to match on. It goes through `create_firm_with_owner()`, a SECURITY
 * DEFINER function, which makes it exactly the kind of code that needs proving:
 * a definer function is a hole in RLS by construction, so its guards are the
 * only thing standing between one user and another user's data.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  anonClient,
  SEED,
  serviceRoleClient,
  signIn,
  supabaseIsReachable,
} from "./helpers/supabase";

const admin = serviceRoleClient();

/** Unique per run so repeated runs do not collide on the email unique index. */
const stamp = Date.now();
const NEW_USER = {
  email: `onboard-${stamp}@testfirm.example`,
  password: "correct-horse-battery-staple",
  fullName: "Onboarding Tester",
};
const FIRM_NAME = `Test Firm ${stamp}`;

let newUserId: string;
let newUserClient: SupabaseClient;
const createdFirmIds: string[] = [];

beforeAll(async () => {
  if (!(await supabaseIsReachable())) {
    throw new Error("Local Supabase is not reachable. Run `npm run db:start` first.");
  }

  newUserClient = anonClient();
  const { data, error } = await newUserClient.auth.signUp({
    email: NEW_USER.email,
    password: NEW_USER.password,
    options: { data: { full_name: NEW_USER.fullName } },
  });
  if (error) throw new Error(`sign-up failed: ${error.message}`);
  newUserId = data.user!.id;
});

afterAll(async () => {
  for (const id of createdFirmIds) await admin.from("firms").delete().eq("id", id);
  if (newUserId) await admin.auth.admin.deleteUser(newUserId);
});

describe("sign-up", () => {
  it("creates a profile row from the auth trigger", async () => {
    const { data } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", newUserId)
      .single();

    expect(data?.full_name).toBe(NEW_USER.fullName);
    expect(data?.email).toBe(NEW_USER.email);
  });

  it("leaves the new user with no firm, so onboarding is required", async () => {
    const { data } = await newUserClient.from("memberships").select("id");
    expect(data ?? []).toEqual([]);
  });

  it("shows the new user nothing from existing firms", async () => {
    // The whole point of the definer function is that it does not become a way
    // in. A user mid-onboarding must still see zero of everyone else's data.
    for (const table of ["clients", "requests", "documents", "firms"]) {
      const { data } = await newUserClient.from(table).select("id");
      expect(data ?? [], `${table} leaked to a user with no firm`).toEqual([]);
    }
  });
});

describe("create_firm_with_owner", () => {
  it("creates the firm and makes the caller its admin", async () => {
    const { data: firmId, error } = await newUserClient.rpc("create_firm_with_owner", {
      p_name: FIRM_NAME,
    });

    expect(error).toBeNull();
    expect(firmId).toBeTruthy();
    createdFirmIds.push(firmId as string);

    const { data: membership } = await admin
      .from("memberships")
      .select("role, firm_id")
      .eq("user_id", newUserId)
      .single();

    expect(membership?.role).toBe("admin");
    expect(membership?.firm_id).toBe(firmId);
  });

  it("writes an audit row for the creation", async () => {
    const { data } = await admin
      .from("activity_events")
      .select("verb, target_type, actor_user_id")
      .eq("firm_id", createdFirmIds[0])
      .eq("verb", "firm.created")
      .single();

    expect(data?.target_type).toBe("firm");
    expect(data?.actor_user_id).toBe(newUserId);
  });

  it("now lets the owner see their own firm, and still nothing else", async () => {
    const { data: firms } = await newUserClient.from("firms").select("id, name");
    expect(firms).toHaveLength(1);
    expect(firms![0].name).toBe(FIRM_NAME);

    // Firm A exists and is populated; none of it may be visible.
    const { data: clients } = await newUserClient.from("clients").select("id");
    expect(clients ?? []).toEqual([]);
  });

  it("refuses a second firm for the same user", async () => {
    // Without this guard a double-submitted form strands the user with an
    // orphaned firm they can never reach, because the session picks one
    // membership.
    const { error } = await newUserClient.rpc("create_firm_with_owner", {
      p_name: "Second Firm",
    });

    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/already belong/i);
  });

  it("refuses an anonymous caller", async () => {
    const anon = anonClient();
    const { error } = await anon.rpc("create_firm_with_owner", { p_name: "Anon Firm" });

    expect(error).not.toBeNull();
  });

  it("rejects a name that is too short", async () => {
    const other = await signIn(SEED.firmA.admin.email);
    const { error } = await other.rpc("create_firm_with_owner", { p_name: "x" });

    expect(error).not.toBeNull();
  });
});
