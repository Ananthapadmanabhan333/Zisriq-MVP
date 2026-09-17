import type { Metadata } from "next";

import { describeDueDate, todayIst } from "@/lib/dates";
import { loadPortalView } from "@/server/services/portal-view";
import { PortalUploader } from "./portal-uploader";

/**
 * The public client portal. No login, no account, mobile-first.
 *
 * Never indexed: the URL contains a credential, so a search engine following it
 * would publish a live upload link.
 */
export const metadata: Metadata = {
  title: "Upload your documents",
  robots: { index: false, follow: false, nocache: true },
};

/** The token is a secret, so nothing here may be cached or statically rendered. */
export const dynamic = "force-dynamic";

function ExpiredNotice() {
  return (
    <div className="bg-card ring-border/60 mx-auto mt-16 max-w-[420px] rounded-2xl p-8 text-center ring-1">
      <h1 className="text-xl font-semibold">This link is no longer valid</h1>
      <p className="text-muted-foreground mt-3 text-[15px]">
        It may have expired, or a newer link may have been sent. Please contact your accountant for
        a fresh one.
      </p>
    </div>
  );
}

export default async function PortalPage({ params }: PageProps<"/p/[token]">) {
  const { token } = await params;
  const view = await loadPortalView(token);

  if (!view) {
    return (
      <div className="dark bg-background text-foreground min-h-screen px-4 py-8">
        <ExpiredNotice />
      </div>
    );
  }

  const due = describeDueDate(view.dueDate, todayIst());
  const outstanding = view.items.filter((item) => item.documents.length === 0);
  const done = view.items.length - outstanding.length;

  return (
    <div className="dark bg-background text-foreground min-h-screen">
      <div className="mx-auto max-w-[560px] px-4 py-8 sm:py-12">
        <header>
          <p className="text-muted-foreground text-[13px]">{view.firmName}</p>
          <h1 className="mt-2 text-[26px] leading-tight font-semibold tracking-tight">
            {view.title}
          </h1>
          <p className="text-muted-foreground mt-2 text-[15px]">
            {view.clientName} · {view.periodLabel}
          </p>

          {view.dueDate ? (
            <p
              className={`mt-3 text-[15px] font-medium ${
                due.tone === "overdue" ? "text-overdue" : "text-primary"
              }`}
            >
              {due.label}
            </p>
          ) : null}
        </header>

        <div className="bg-card ring-border/60 mt-6 rounded-2xl p-5 ring-1">
          <div className="flex items-baseline justify-between">
            <p className="text-[15px] font-medium">
              {done} of {view.items.length} uploaded
            </p>
            <p className="text-muted-foreground text-[13px]">
              {outstanding.length === 0 ? "All done" : `${outstanding.length} to go`}
            </p>
          </div>
          <div
            className="bg-secondary mt-3 h-2 overflow-hidden rounded-full"
            role="progressbar"
            aria-valuenow={done}
            aria-valuemin={0}
            aria-valuemax={view.items.length}
            aria-label={`${done} of ${view.items.length} documents uploaded`}
          >
            <div
              className="bg-primary h-full rounded-full transition-[width]"
              style={{ width: `${view.items.length ? (done / view.items.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        {outstanding.length === 0 ? (
          <div className="bg-received/10 ring-received/25 mt-6 rounded-2xl p-6 text-center ring-1">
            <p className="text-received text-[15px] font-medium">Everything is in</p>
            <p className="text-muted-foreground mt-2 text-sm">
              {view.firmName} will be in touch if anything else is needed. You can close this page.
            </p>
          </div>
        ) : null}

        <PortalUploader token={token} items={view.items} />

        <p className="text-muted-foreground mt-10 text-center text-[13px]">
          This link is personal to you. Please do not forward it.
        </p>
      </div>
    </div>
  );
}
