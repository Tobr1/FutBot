import { Suspense } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { GroupBottomNav, GroupBottomNavSkeleton, GroupTabs, GroupTabsSkeleton } from "@/components/layout/group-nav";
import { GroupSwitcher } from "@/components/layout/group-switcher";
import { ResumeRefresh } from "@/components/layout/resume-refresh";
import { Skeleton } from "@/components/ui/skeleton";
import { getGroupContext, getIsAppAdmin, getMyGroups } from "@/features/groups/queries";

type Params = LayoutProps<"/g/[slug]">["params"];

/**
 * Chrome del grupo. El layout no espera params ni la sesión en su nivel
 * superior: el selector entra en streaming dentro de su <Suspense>, y las
 * barras de navegación leen el slug con useParams (con un esqueleto idéntico
 * de fallback), así forman parte del shell prerenderizado.
 * La membresía la sigue validando cada página con getGroupContext (y RLS).
 */
export default function GroupLayout({ children, params }: LayoutProps<"/g/[slug]">) {
  return (
    <div data-shell="group" className="min-h-dvh">
      <AppHeader showLogo="desktop" className="lg:border-b-0">
        <Suspense fallback={<SwitcherSkeleton />}>
          <SwitcherSlot params={params} />
        </Suspense>
      </AppHeader>
      <div className="app-chrome sticky top-[calc(var(--header-h)+var(--safe-top))] z-30 hidden border-b border-hairline bg-background/85 backdrop-blur-md lg:block">
        <div className="mx-auto max-w-5xl px-4">
          <Suspense fallback={<GroupTabsSkeleton />}>
            <GroupTabs />
          </Suspense>
        </div>
      </div>
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl px-4 pt-4 pb-[calc(var(--chrome-bottom)+5.5rem)] outline-none lg:pt-6 lg:pb-16"
      >
        {children}
      </main>
      <Suspense fallback={<GroupBottomNavSkeleton />}>
        <GroupBottomNav />
      </Suspense>
      <ResumeRefresh />
    </div>
  );
}

function SwitcherSkeleton() {
  return (
    <div aria-hidden="true" className="flex min-h-11 min-w-0 items-center gap-2">
      <Skeleton className="size-7 shrink-0 rounded-[28%_28%_46%_46%]" />
      <Skeleton className="h-5 w-32" />
    </div>
  );
}

async function SwitcherSlot({ params }: { params: Params }) {
  const { slug } = await params;
  const [{ group }, groups, isAppAdmin] = await Promise.all([getGroupContext(slug), getMyGroups(), getIsAppAdmin()]);
  return (
    <GroupSwitcher
      current={{ slug: group.slug, name: group.name }}
      groups={groups.map((g) => ({ slug: g.slug, name: g.name, playerCount: g.playerCount, role: g.role }))}
      canCreateGroup={isAppAdmin}
    />
  );
}
