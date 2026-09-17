import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/page-header";
import { formatIstDate } from "@/lib/dates";
import { can, ROLE_LABELS, type Role } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/server/auth/session";
import { InviteForm } from "./invite-form";

export const metadata: Metadata = { title: "Members" };

export default async function MembersPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from("memberships")
      .select("id, role, user_id, created_at, profiles(full_name, email)")
      .order("created_at", { ascending: true }),
    supabase
      .from("invites")
      .select("id, email, role, expires_at")
      .is("accepted_at", null)
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const mayInvite = can(session.role, "member.invite");

  return (
    <main className="flex-1 space-y-6 px-8 pb-8">
      <PageHeader
        title="Members"
        description={`Who can see ${session.firmName}'s clients and requests.`}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <section className="space-y-4">
          <div className="bg-card ring-border/60 overflow-hidden rounded-2xl ring-1">
            <table className="w-full text-left">
              <thead className="text-muted-foreground border-border/60 border-b text-[13px]">
                <tr>
                  <th scope="col" className="px-6 py-4 font-medium">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-4 font-medium">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-4 font-medium">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border/60 divide-y">
                {(members ?? []).map((member) => {
                  const profile = Array.isArray(member.profiles)
                    ? member.profiles[0]
                    : member.profiles;
                  const isSelf = member.user_id === session.userId;

                  return (
                    <tr key={member.id}>
                      <td className="px-6 py-4">
                        <span className="font-medium">
                          {profile?.full_name?.trim() || profile?.email}
                        </span>
                        {isSelf ? (
                          <span className="text-muted-foreground ml-2 text-xs">(you)</span>
                        ) : null}
                        <span className="text-muted-foreground block text-[13px]">
                          {profile?.email}
                        </span>
                      </td>
                      <td className="text-muted-foreground px-6 py-4 text-[15px]">
                        {ROLE_LABELS[member.role as Role]}
                      </td>
                      <td className="text-muted-foreground px-6 py-4 text-[13px]">
                        {formatIstDate(new Date(member.created_at))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {(invites ?? []).length > 0 ? (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Pending invitations</h2>
              <ul className="space-y-2">
                {(invites ?? []).map((invite) => (
                  <li
                    key={invite.id}
                    className="bg-card ring-border/60 flex items-center gap-4 rounded-xl px-5 py-3.5 ring-1"
                  >
                    <span className="min-w-0 flex-1 truncate text-[15px]">{invite.email}</span>
                    <span className="text-muted-foreground text-[13px]">
                      {ROLE_LABELS[invite.role as Role]}
                    </span>
                    <span className="text-muted-foreground text-[13px]">
                      expires {formatIstDate(new Date(invite.expires_at))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {mayInvite ? (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Invite someone</h2>
            <div className="bg-card ring-border/60 rounded-2xl p-6 ring-1">
              <InviteForm />
            </div>
          </section>
        ) : (
          <section className="bg-card ring-border/60 rounded-2xl p-6 ring-1">
            <p className="text-muted-foreground text-[15px]">
              Only an admin can invite or remove members.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
