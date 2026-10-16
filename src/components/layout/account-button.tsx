import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentProfile } from "@/lib/auth/session";
import { UserMenu } from "./user-menu";

/** Lee la sesión: usar siempre dentro de <Suspense fallback={<AccountButtonSkeleton />}>. */
export async function AccountButton() {
  const profile = await getCurrentProfile();
  return <UserMenu name={profile.displayName} email={profile.email} avatarUrl={profile.avatarUrl} />;
}

export function AccountButtonSkeleton() {
  return <Skeleton className="size-8 rounded-full" />;
}
