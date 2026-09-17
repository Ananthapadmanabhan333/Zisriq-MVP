import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  extensionOf,
  safeFilename,
  uploadUrlSchema,
} from "@/lib/validation/upload";
import { createAdminClient } from "@/server/db/admin";
import { resolvePortalToken } from "@/server/services/portal-tokens";
import { itemBelongsToScope } from "@/server/services/portal-view";

/**
 * Mints a one-shot signed URL the browser uploads straight to Supabase Storage.
 *
 * The file never passes through this server. Vercel caps a serverless request
 * body at roughly 4.5 MB, so a 25 MB upload through a route handler is not
 * merely slow — it cannot work at all. See DECISIONS.md D-001.
 *
 * Authorisation is the portal token, read from the request body rather than a
 * session. Everything else in the payload is attacker-controlled and treated
 * that way: the item is verified to belong to the token's request, and the
 * object key is generated here so a caller cannot choose where their file lands.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const token = typeof payload.token === "string" ? payload.token : "";

  const scope = await resolvePortalToken(token);
  // One message for expired, revoked and never-existed, so this cannot be used
  // to probe which links were ever real.
  if (!scope) {
    return NextResponse.json({ error: "This link is no longer valid." }, { status: 401 });
  }

  const parsed = uploadUrlSchema.safeParse({
    itemId: payload.itemId,
    filename: payload.filename,
    contentType: payload.contentType,
    sizeBytes: payload.sizeBytes,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "That file could not be accepted." },
      { status: 400 },
    );
  }

  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(parsed.data.contentType)) {
    return NextResponse.json(
      { error: "That file type is not accepted. PDF, image, spreadsheet or Word file." },
      { status: 400 },
    );
  }

  const filename = safeFilename(parsed.data.filename);
  const extension = extensionOf(filename);
  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(extension)) {
    return NextResponse.json({ error: "That file extension is not accepted." }, { status: 400 });
  }

  // The item id came from the browser. Without this the token for one request
  // would authorise uploads into any item in the database.
  if (!(await itemBelongsToScope(parsed.data.itemId, scope))) {
    return NextResponse.json({ error: "That item is not part of this request." }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: item } = await admin
    .from("request_items")
    .select("request_id, requests(client_id)")
    .eq("id", parsed.data.itemId)
    .single();

  const requestRow = Array.isArray(item?.requests) ? item?.requests[0] : item?.requests;
  const clientId = requestRow?.client_id;
  if (!clientId) {
    return NextResponse.json({ error: "That item is not part of this request." }, { status: 403 });
  }

  // Key is server-generated: firm/client/request/pending/<uuid>.<ext>. The
  // original filename is stored as a column, never as part of the path.
  const storagePath = `${scope.firmId}/${clientId}/${scope.requestId}/pending/${randomUUID()}.${extension}`;

  const { data, error } = await admin.storage.from("documents").createSignedUploadUrl(storagePath);

  if (error) {
    return NextResponse.json({ error: "Could not prepare the upload." }, { status: 500 });
  }

  return NextResponse.json({
    uploadUrl: data.signedUrl,
    token: data.token,
    storagePath,
  });
}
