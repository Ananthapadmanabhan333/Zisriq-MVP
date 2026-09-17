"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { FormBanner } from "@/components/ui/field";
import { nextStatuses, STATUS_LABELS, type Status } from "@/lib/status";
import { changeRequestStatus } from "@/server/actions/requests";

/**
 * Offers only the transitions the status machine permits, so the UI cannot
 * suggest a move the database will refuse. The server re-checks and so does a
 * trigger — this is convenience, not enforcement.
 */
export function StatusActions({ requestId, status }: { requestId: string; status: Status }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const options = nextStatuses(status);

  if (options.length === 0) {
    return (
      <p className="text-muted-foreground text-[13px]">
        This request is {STATUS_LABELS[status].toLowerCase()}. Reopening it means creating a new
        request.
      </p>
    );
  }

  const move = (to: Status) =>
    startTransition(async () => {
      setError(null);
      const result = await changeRequestStatus(requestId, to);
      if (!result.ok) setError(result.message);
    });

  return (
    <div className="space-y-3">
      {error ? <FormBanner tone="error">{error}</FormBanner> : null}

      <div className="flex flex-wrap gap-2">
        {options.map((to) => (
          <Button
            key={to}
            type="button"
            size="sm"
            variant={to === "cancelled" ? "ghost" : "secondary"}
            disabled={pending}
            onClick={() => move(to)}
          >
            {to === "cancelled" ? "Cancel request" : `Mark ${STATUS_LABELS[to].toLowerCase()}`}
          </Button>
        ))}
      </div>
    </div>
  );
}
