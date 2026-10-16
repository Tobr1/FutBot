import { Shield, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { MemberActions } from "@/features/groups/components/member-actions";
import { SettingsShell } from "@/features/groups/components/settings-shell";
import { getGroupContext, listMembers } from "@/features/groups/queries";
import { formatDate } from "@/lib/format";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Miembros" };

export default async function MembersPage({ params }: PageProps<"/g/[slug]/ajustes/miembros">) {
  const { slug } = await params;
  const ctx = await getGroupContext(slug);
  const members = await listMembers(ctx.group.id);

  return (
    <SettingsShell ctx={ctx} title="Miembros" description={`${members.length} ${members.length === 1 ? "persona" : "personas"} con cuenta en el grupo.`}>
      {ctx.isAdmin && (
        <div>
          <Button asChild>
            <Link href={routes.groupInvitations(slug)}>
              <UserPlus aria-hidden="true" />
              Invitar
            </Link>
          </Button>
        </div>
      )}
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card/70">
        {members.map((member) => {
          const isMe = member.profileId === ctx.userId;
          return (
            <li key={member.profileId} className="flex items-center gap-3 px-4 py-3">
              <UserAvatar name={member.displayName} src={member.avatarUrl} size="md" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate font-medium">
                  {member.displayName}
                  {isMe && <span className="text-xs text-muted-foreground">(vos)</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {member.player ? (
                    <Link href={routes.player(slug, member.player.id)} className="hover:text-foreground">
                      Ficha: {member.player.nickname}
                    </Link>
                  ) : (
                    "Sin ficha vinculada"
                  )}
                  {" · "}desde {formatDate(member.joinedAt)}
                </p>
              </div>
              {member.role === "admin" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-gold uppercase">
                  <Shield className="size-3" aria-hidden="true" />
                  Admin
                </span>
              )}
              {ctx.isAdmin && !isMe && (
                <MemberActions
                  groupId={ctx.group.id}
                  member={{ profileId: member.profileId, displayName: member.displayName, role: member.role }}
                />
              )}
            </li>
          );
        })}
      </ul>
    </SettingsShell>
  );
}
