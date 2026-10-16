import { Suspense } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { GroupBottomNav, GroupTabs } from "@/components/layout/group-nav";
import { GroupSwitcher } from "@/components/layout/group-switcher";
import { Skeleton } from "@/components/ui/skeleton";
import { getGroupContext, getMyGroups } from "@/features/groups/queries";

type Params = LayoutProps<"/g/[slug]">["params"];

/**
 * Chrome del grupo. El layout no espera params ni la sesión en su nivel
 * superior: cada parte dinámica entra en streaming dentro de su <Suspense>.
 */
export default function GroupLayout({ children, params }: LayoutProps<"/g/[slug]">) {
  return (
    <div className="min-h-dvh">
      <AppHeader className="lg:border-b-0">
        <Suspense fallback={<Skeleton className="h-6 w-40" />}>
          <SwitcherSlot params={params} />
        </Suspense>
      </AppHeader>
      <div className="sticky top-14 z-30 hidden border-b border-border bg-background/75 backdrop-blur-xl lg:block">
        <div className="mx-auto max-w-5xl px-4">
          <Suspense fallback={<div className="h-11" />}>
            <TabsSlot params={params} />
          </Suspense>
        </div>
      </div>
      <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-28 lg:pb-16">{children}</main>
      <Suspense fallback={null}>
        <BottomNavSlot params={params} />
      </Suspense>
    </div>
  );
}

async function SwitcherSlot({ params }: { params: Params }) {
  const { slug } = await params;
  const [{ group }, groups] = await Promise.all([getGroupContext(slug), getMyGroups()]);
  return <GroupSwitcher current={{ slug: group.slug, name: group.name }} groups={groups.map((g) => ({ slug: g.slug, name: g.name }))} />;
}

async function TabsSlot({ params }: { params: Params }) {
  const { slug } = await params;
  await getGroupContext(slug);
  return <GroupTabs slug={slug} />;
}

async function BottomNavSlot({ params }: { params: Params }) {
  const { slug } = await params;
  await getGroupContext(slug);
  return <GroupBottomNav slug={slug} />;
}
