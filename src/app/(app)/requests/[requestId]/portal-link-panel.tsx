"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Link2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormBanner } from "@/components/ui/field";
import { formatIstDate } from "@/lib/dates";
import { issueRequestPortalLink, type IssuedLink } from "@/server/actions/portal";

export function PortalLinkPanel({
  requestId,
  clientEmail,
}: {
  requestId: string;
  clientEmail: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [link, setLink] = useState<IssuedLink | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const issue = () =>
    startTransition(async () => {
      setError(null);
      const result = await issueRequestPortalLink(requestId);
      if (result.ok) setLink(result.data);
      else setError(result.message);
    });

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is blocked in some browsers without a user gesture chain.
      // The input below is selectable, so there is always a manual path.
      setError("Could not copy automatically — select the link and copy it.");
    }
  };

  return (
    <div className="bg-card ring-border/60 space-y-4 rounded-2xl p-5 ring-1">
      <div className="flex items-center gap-2.5">
        <Link2 className="text-muted-foreground size-[18px]" aria-hidden />
        <h2 className="text-[15px] font-medium">Client upload link</h2>
      </div>

      {error ? <FormBanner tone="error">{error}</FormBanner> : null}

      {link ? (
        <>
          <p className="text-muted-foreground text-[13px]">
            Copy this now — it is shown once. Issuing another link revokes this one.
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={link.url}
              aria-label="Client upload link"
              onFocus={(e) => e.currentTarget.select()}
              className="bg-surface-raised ring-border/50 min-w-0 flex-1 rounded-xl px-3 py-2 font-mono text-[12px] ring-1 outline-none"
            />
            <Button type="button" variant="secondary" size="sm" onClick={copy}>
              {copied ? (
                <Check className="size-4" aria-hidden />
              ) : (
                <Copy className="size-4" aria-hidden />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="text-muted-foreground text-[13px]">
            Expires {formatIstDate(new Date(link.expiresAt))}.
          </p>
        </>
      ) : (
        <>
          <p className="text-muted-foreground text-[13px]">
            {clientEmail
              ? `A secure link ${clientEmail} can open on their phone. No account needed.`
              : "A secure link the client opens on their phone. No account needed. Add a contact email to send it automatically."}
          </p>
          <Button type="button" size="sm" onClick={issue} disabled={pending} className="w-full">
            {pending ? "Creating…" : "Create upload link"}
          </Button>
        </>
      )}
    </div>
  );
}
