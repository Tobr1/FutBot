import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentProfile } from "@/lib/auth/session";
import { UserMenu } from "./user-menu";

/** Lee la sesión: usar siempre dentro de <Suspense fallback={<AccountButtonSkeleton />}>. */
export async function AccountButton() {
  const profile = await getCurrentProfile();
  return <UserMenu name={profile.displayName} email={profile.email} avatarUrl={profile.avatarUrl} />;
}

/** Misma caja de 44px que el disparador del menú de cuenta. */
export function AccountButtonSkeleton() {
  return (
    <div aria-hidden="true" className="grid size-11 shrink-0 place-items-center">
      <Skeleton className="size-8 rounded-full" />
    </div>
  );
}
