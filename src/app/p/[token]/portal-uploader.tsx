"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Circle, Upload } from "lucide-react";

import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES, UPLOAD_HINT } from "@/lib/validation/upload";
import type { PortalItem } from "@/server/services/portal-view";

/**
 * Uploads go straight from the browser to Supabase Storage using a one-shot
 * signed URL. The file never passes through our server, which is what makes 25 MB
 * possible at all — a Vercel function body caps out around 4.5 MB.
 *
 * Three steps per file: ask for a signed URL, PUT the file, then confirm so the
 * server can sniff the contents and record the row. A file that is uploaded but
 * never confirmed stays under a `pending/` prefix with nothing pointing at it.
 */
type UploadState =
  | { phase: "idle" }
  | { phase: "uploading"; progress: number }
  | { phase: "error"; message: string };

export function PortalUploader({ token, items }: { token: string; items: PortalItem[] }) {
  return (
    <ul className="mt-6 space-y-3">
      {items.map((item) => (
        <ItemUploader key={item.id} token={token} item={item} />
      ))}
    </ul>
  );
}

function ItemUploader({ token, item }: { token: string; item: PortalItem }) {
  const router = useRouter();
  const [state, setState] = useState<UploadState>({ phase: "idle" });

  const uploaded = item.documents.length > 0;

  async function handleFile(file: File) {
    // Checked here for an instant message, and again on the server because
    // anything the browser asserts is caller-supplied.
    if (file.size > MAX_UPLOAD_BYTES) {
      setState({ phase: "error", message: "That file is larger than 25 MB." });
      return;
    }
    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
      setState({ phase: "error", message: "That file type is not accepted." });
      return;
    }

    setState({ phase: "uploading", progress: 10 });

    try {
      const urlResponse = await fetch("/api/portal/upload-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          itemId: item.id,
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        }),
      });

      const urlPayload = await urlResponse.json();
      if (!urlResponse.ok) throw new Error(urlPayload.error ?? "Could not start the upload.");

      setState({ phase: "uploading", progress: 35 });

      const put = await fetch(urlPayload.uploadUrl, {
        method: "PUT",
        headers: { "content-type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error("The upload did not complete. Please try again.");

      setState({ phase: "uploading", progress: 80 });

      const confirm = await fetch("/api/portal/upload-confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          itemId: item.id,
          storagePath: urlPayload.storagePath,
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        }),
      });

      const confirmPayload = await confirm.json();
      if (!confirm.ok) throw new Error(confirmPayload.error ?? "That upload could not be saved.");

      setState({ phase: "idle" });
      router.refresh();
    } catch (error) {
      setState({
        phase: "error",
        message: error instanceof Error ? error.message : "Something went wrong.",
      });
    }
  }

  return (
    <li className="bg-card ring-border/60 rounded-2xl p-5 ring-1">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0" aria-hidden>
          {uploaded ? (
            <CheckCircle2 className="text-received size-5" />
          ) : (
            <Circle className="text-muted-foreground size-5" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {item.label}
            {!item.isMandatory ? (
              <span className="text-muted-foreground ml-2 text-[13px] font-normal">optional</span>
            ) : null}
          </p>
          {item.description ? (
            <p className="text-muted-foreground mt-1 text-[13px]">{item.description}</p>
          ) : null}

          {item.documents.length > 0 ? (
            <ul className="mt-3 space-y-1.5">
              {item.documents.map((doc) => (
                <li key={doc.id} className="text-muted-foreground truncate text-[13px]">
                  {doc.filename} · {Math.round(doc.sizeBytes / 1024)} KB
                </li>
              ))}
            </ul>
          ) : null}

          {state.phase === "error" ? (
            <p role="alert" className="text-destructive mt-3 text-[13px]">
              {state.message}
            </p>
          ) : null}

          {state.phase === "uploading" ? (
            <div className="mt-3">
              <div className="bg-secondary h-1.5 overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-[width]"
                  style={{ width: `${state.progress}%` }}
                />
              </div>
              <p className="text-muted-foreground mt-2 text-[13px]">Uploading…</p>
            </div>
          ) : (
            <div className="mt-3">
              <input
                type="file"
                className="sr-only"
                id={`file-${item.id}`}
                accept={ALLOWED_MIME_TYPES.join(",")}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  // Reset so choosing the same file twice still fires onChange.
                  e.target.value = "";
                  if (file) void handleFile(file);
                }}
              />
              <label
                htmlFor={`file-${item.id}`}
                className="bg-secondary ring-border hover:bg-surface-raised inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium ring-1 transition-colors"
              >
                <Upload className="size-4" aria-hidden />
                {uploaded ? "Upload another" : "Choose file"}
              </label>
              <p className="text-muted-foreground mt-2 text-[12px]">{UPLOAD_HINT}</p>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
