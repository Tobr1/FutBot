"use client";

import { Loader2, LogIn } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { acceptInvitationAction } from "../actions";

export function AcceptInvitationButton({ token, groupName }: { token: string; groupName: string }) {
  const [isPending, startTransition] = useTransition();

  function accept() {
    startTransition(async () => {
      const result = await acceptInvitationAction(token);
      if (!result.ok) toast.error(result.message);
    });
  }

  return (
    <Button size="lg" className="w-full" onClick={accept} disabled={isPending}>
      {isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <LogIn aria-hidden="true" />}
      Unirme a {groupName}
    </Button>
  );
}
