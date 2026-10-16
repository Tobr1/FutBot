import type { ReactNode } from "react";
import { PageHeader } from "@/components/shared/page-header";
import type { GroupContext } from "../queries";
import { SettingsNav } from "./settings-nav";

export function SettingsShell({ ctx, title, description, children }: { ctx: GroupContext; title: string; description?: string; children: ReactNode }) {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={ctx.group.name} title={title} description={description} />
      <SettingsNav slug={ctx.group.slug} isAdmin={ctx.isAdmin} />
      {children}
    </div>
  );
}
