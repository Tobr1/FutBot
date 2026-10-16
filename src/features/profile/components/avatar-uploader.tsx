"use client";

import { Camera, Loader2, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { updateAvatarAction } from "../actions";
import { resizeToSquareWebp } from "../resize-image";

const MAX_INPUT_BYTES = 10 * 1024 * 1024;

export function AvatarUploader({ userId, name, avatarUrl }: { userId: string; name: string; avatarUrl: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(avatarUrl);
  const [isPending, startTransition] = useTransition();

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Elegí una imagen (JPG, PNG o WebP).");
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      toast.error("La imagen es demasiado grande (máximo 10 MB).");
      return;
    }

    startTransition(async () => {
      try {
        const blob = await resizeToSquareWebp(file);
        const supabase = createClient();
        const path = `${userId}/avatar.webp`;
        const { error } = await supabase.storage.from("avatars").upload(path, blob, {
          upsert: true,
          contentType: "image/webp",
          cacheControl: "3600",
        });
        if (error) throw error;
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        // Versión en la URL para que el navegador no muestre la foto anterior.
        const url = `${data.publicUrl}?v=${Date.now()}`;
        const result = await updateAvatarAction(url);
        if (!result.ok) throw new Error(result.message);
        setPreview(url);
        toast.success(result.message);
      } catch {
        toast.error("No pudimos subir la foto. Probá con otra imagen.");
      }
    });
  }

  function onRemove() {
    startTransition(async () => {
      const result = await updateAvatarAction(null);
      if (result.ok) {
        setPreview(null);
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <UserAvatar name={name} src={preview} size="xl" />
        {isPending && (
          <span className="absolute inset-0 grid place-items-center rounded-full bg-black/50">
            <Loader2 className="size-6 animate-spin" aria-label="Subiendo" />
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onFileChange} />
        <Button type="button" variant="secondary" disabled={isPending} onClick={() => inputRef.current?.click()}>
          <Camera aria-hidden="true" />
          {preview ? "Cambiar foto" : "Subir foto"}
        </Button>
        {preview && (
          <Button type="button" variant="ghost" disabled={isPending} onClick={onRemove}>
            <Trash2 aria-hidden="true" />
            Quitar
          </Button>
        )}
      </div>
    </div>
  );
}
