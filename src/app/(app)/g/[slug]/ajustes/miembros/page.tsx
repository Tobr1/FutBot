import { Shield, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ListGroup, ListRow } from "@/components/shared/list-group";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
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
    <SettingsShell
      slug={slug}
      title="Miembros"
      description={`${members.length} con cuenta`}
      actions={
        ctx.isAdmin ? (
          <Button asChild className="max-sm:size-11 max-sm:px-0">
            <Link href={routes.groupInvitations(slug)} transitionTypes={["nav-forward"]}>
              <UserPlus aria-hidden="true" />
              <span className="max-sm:sr-only">Invitar</span>
            </Link>
          </Button>
        ) : undefined
      }
    >
      <ListGroup label="Miembros">
        {members.map((member) => {
          const isMe = member.profileId === ctx.userId;
          const since = `desde ${formatDate(member.joinedAt)}`;
          return (
            <ListRow
              key={member.profileId}
              leading={<UserAvatar name={member.displayName} src={member.avatarUrl} size="md" />}
              title={
                <>
                  {member.displayName}
                  {isMe && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(vos)</span>}
                </>
              }
              subtitle={member.player ? `Ficha: ${member.player.nickname} · ${since}` : `Sin ficha vinculada · ${since}`}
              trailing={
                member.role === "admin" || (ctx.isAdmin && !isMe) ? (
                  <>
                    {member.role === "admin" && (
                      <Badge tone="neutral" size="sm">
                        <Shield className="text-primary" aria-hidden="true" />
                        Admin
                      </Badge>
                    )}
                    {ctx.isAdmin && !isMe && (
                      <span className="-mr-2">
                        <MemberActions
                          groupId={ctx.group.id}
                          member={{ profileId: member.profileId, displayName: member.displayName, role: member.role }}
                        />
                      </span>
                    )}
                  </>
                ) : undefined
              }
            />
          );
        })}
      </ListGroup>
    </SettingsShell>
  );
}
