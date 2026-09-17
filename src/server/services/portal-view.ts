import "server-only";

import { createAdminClient } from "@/server/db/admin";
import { resolvePortalToken, type PortalScope } from "./portal-tokens";

/**
 * Everything the public portal is allowed to see, and nothing else.
 *
 * This runs with the service role, because a client has no Supabase session —
 * the token is the credential. That makes this module the highest-risk surface
 * in the product: RLS is not protecting it, so the scoping here IS the security
 * boundary.
 *
 * Two rules keep it honest:
 *   1. Every query filters by the request id the token resolved to. Never by
 *      anything taken from the URL or the form.
 *   2. Only the columns a client should see are selected. No internal notes, no
 *      assignee, no other clients, no other requests.
 */

export type PortalItem = {
  id: string;
  label: string;
  description: string | null;
  isMandatory: boolean;
  status: string;
  documents: { id: string; filename: string; sizeBytes: number }[];
};

export type PortalView = {
  scope: PortalScope;
  firmName: string;
  clientName: string;
  title: string;
  periodLabel: string;
  dueDate: string | null;
  status: string;
  items: PortalItem[];
};

export async function loadPortalView(token: string): Promise<PortalView | null> {
  const scope = await resolvePortalToken(token);
  if (!scope) return null;

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("requests")
    .select(
      `id, title, period_label, due_date, status,
       firms(name),
       clients(name),
       request_items(id, label, description, is_mandatory, status, sort_order,
                     documents(id, original_filename, size_bytes))`,
    )
    .eq("id", scope.requestId)
    .maybeSingle();

  if (error || !data) return null;

  // A closed request must stop accepting uploads even if the link is still live.
  if (data.status === "cancelled") return null;

  const firm = Array.isArray(data.firms) ? data.firms[0] : data.firms;
  const client = Array.isArray(data.clients) ? data.clients[0] : data.clients;

  const items: PortalItem[] = [...(data.request_items ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => ({
      id: item.id,
      label: item.label,
      description: item.description,
      isMandatory: item.is_mandatory,
      status: item.status,
      documents: (item.documents ?? []).map((doc) => ({
        id: doc.id,
        filename: doc.original_filename,
        sizeBytes: doc.size_bytes,
      })),
    }));

  return {
    scope,
    firmName: firm?.name ?? "Your accountant",
    clientName: client?.name ?? "",
    title: data.title,
    periodLabel: data.period_label,
    dueDate: data.due_date,
    status: data.status,
    items,
  };
}

/**
 * Confirms that an item belongs to the request the token granted.
 *
 * The item id arrives from the browser, so it is attacker-controlled. Without
 * this check a client could upload into another firm's request by editing one
 * field — the token would still be valid, just not for that item.
 */
export async function itemBelongsToScope(itemId: string, scope: PortalScope): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("request_items")
    .select("id")
    .eq("id", itemId)
    .eq("request_id", scope.requestId)
    .maybeSingle();

  return Boolean(data);
}
