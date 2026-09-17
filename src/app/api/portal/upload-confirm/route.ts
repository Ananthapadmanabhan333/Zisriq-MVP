import { NextResponse, type NextRequest } from "next/server";

import { safeFilename, uploadConfirmSchema } from "@/lib/validation/upload";
import { sniffMimeType } from "@/server/services/sniff";
import { createAdminClient } from "@/server/db/admin";
import { resolvePortalToken, touchPortalToken } from "@/server/services/portal-tokens";
import { itemBelongsToScope } from "@/server/services/portal-view";

/**
 * Records a document row once the browser has finished uploading.
 *
 * Runs after the file is in storage, and is where the upload actually becomes
 * real: until this succeeds the object sits under a `pending/` prefix and no row
 * references it.
 *
 * The declared content type is not trusted. The first bytes of the stored object
 * are read back and matched against the file's magic number, because an attacker
 * can label an executable `application/pdf` and the storage service will believe
 * them. A mismatch deletes the object rather than recording it.
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
  if (!scope) {
    return NextResponse.json({ error: "This link is no longer valid." }, { status: 401 });
  }

  const parsed = uploadConfirmSchema.safeParse({
    itemId: payload.itemId,
    storagePath: payload.storagePath,
    filename: payload.filename,
    contentType: payload.contentType,
    sizeBytes: payload.sizeBytes,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "That upload could not be recorded." }, { status: 400 });
  }

  // The path is caller-supplied, so re-derive what it is allowed to be rather
  // than trusting it. Anchoring on the token's firm and request means a forged
  // path cannot claim a file that belongs to someone else.
  const expectedPrefix = `${scope.firmId}/`;
  if (
    !parsed.data.storagePath.startsWith(expectedPrefix) ||
    !parsed.data.storagePath.includes(`/${scope.requestId}/`) ||
    parsed.data.storagePath.includes("..")
  ) {
    return NextResponse.json({ error: "That upload could not be recorded." }, { status: 403 });
  }

  if (!(await itemBelongsToScope(parsed.data.itemId, scope))) {
    return NextResponse.json({ error: "That item is not part of this request." }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: blob, error: downloadError } = await admin.storage
    .from("documents")
    .download(parsed.data.storagePath);

  if (downloadError || !blob) {
    return NextResponse.json({ error: "That upload could not be found." }, { status: 400 });
  }

  const head = Buffer.from(await blob.slice(0, 4100).arrayBuffer());
  const sniffed = sniffMimeType(head, parsed.data.filename);

  if (!sniffed.accepted) {
    await admin.storage.from("documents").remove([parsed.data.storagePath]);
    return NextResponse.json(
      { error: "That file's contents do not match its type, so it was rejected." },
      { status: 400 },
    );
  }

  // Promote out of the pending prefix now that the contents are trusted.
  const finalPath = parsed.data.storagePath.replace("/pending/", "/");
  const { error: moveError } = await admin.storage
    .from("documents")
    .move(parsed.data.storagePath, finalPath);

  const storedPath = moveError ? parsed.data.storagePath : finalPath;

  const { error: insertError } = await admin.from("documents").insert({
    firm_id: scope.firmId,
    request_item_id: parsed.data.itemId,
    storage_path: storedPath,
    original_filename: safeFilename(parsed.data.filename),
    mime_type: parsed.data.contentType,
    sniffed_mime: sniffed.mime,
    size_bytes: parsed.data.sizeBytes,
    uploaded_by_token: scope.tokenId,
  });

  if (insertError) {
    await admin.storage.from("documents").remove([storedPath]);
    return NextResponse.json({ error: "That upload could not be recorded." }, { status: 500 });
  }

  // The item has what was asked for; the request follows once every item does.
  await admin
    .from("request_items")
    .update({ status: "received" })
    .eq("id", parsed.data.itemId)
    .eq("request_id", scope.requestId);

  await admin.from("activity_events").insert({
    firm_id: scope.firmId,
    actor_token_id: scope.tokenId,
    verb: "document.uploaded",
    target_type: "request_item",
    target_id: parsed.data.itemId,
    metadata: { label: safeFilename(parsed.data.filename) },
  });

  await touchPortalToken(scope.tokenId);

  return NextResponse.json({ ok: true });
}
