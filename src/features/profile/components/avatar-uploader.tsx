"use client";

import { Camera, Loader2 } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { updateAvatarAction } from "../actions";
import { resizeToSquareWebp } from "../resize-image";

const MAX_INPUT_BYTES = 10 * 1024 * 1024;

/**
 * Foto de perfil: avatar grande con un botón de cámara superpuesto.
 * La foto nueva se ve apenas se procesa (URL local del blob); si la subida
 * falla, vuelve la anterior.
 */
export function AvatarUploader({
  userId,
  name,
  avatarUrl,
  className,
}: {
  userId: string;
  name: string;
  avatarUrl: string | null;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [preview, setPreview] = useState(avatarUrl);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);
  const [isPending, startTransition] = useTransition();

  // Libera la URL local al desmontar.
  useEffect(() => {
    const ref = objectUrlRef;
    return () => {
      if (ref.current) URL.revokeObjectURL(ref.current);
    };
  }, []);

  function revokeObjectUrl() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }

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

    // La foto actual (puede ser una URL local de una subida anterior): se
    // conserva hasta que la nueva quede guardada, para poder volver a ella.
    const previous = preview;
    const previousObjectUrl = objectUrlRef.current;
    setBusy("upload");
    startTransition(async () => {
      let localUrl: string | null = null;
      try {
        const blob = await resizeToSquareWebp(file);
        // Vista previa inmediata con la imagen ya procesada.
        localUrl = URL.createObjectURL(blob);
        objectUrlRef.current = localUrl;
        setPreview(localUrl);

        const supabase = createClient();
        const path = `${userId}/avatar.webp`;
        const { error } = await supabase.storage.from("avatars").upload(path, blob, {
          upsert: true,
          contentType: "image/webp",
          // La URL lleva versión (?v=), así que se puede cachear sin vencer.
          cacheControl: "31536000",
        });
        if (error) throw error;
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        // Versión en la URL para que el navegador no muestre la foto anterior.
        const url = `${data.publicUrl}?v=${Date.now()}`;
        const result = await updateAvatarAction(url);
        if (!result.ok) throw new Error(result.message);
        if (previousObjectUrl) URL.revokeObjectURL(previousObjectUrl);
        toast.success(result.message);
      } catch {
        // Vuelve la foto anterior y se libera la local nueva.
        if (localUrl) {
          URL.revokeObjectURL(localUrl);
          objectUrlRef.current = previousObjectUrl;
        }
        setPreview(previous);
        toast.error("No pudimos subir la foto. Probá con otra imagen.");
      } finally {
        setBusy(null);
      }
    });
  }

  function onRemove() {
    setBusy("remove");
    startTransition(async () => {
      const result = await updateAvatarAction(null);
      if (result.ok) {
        revokeObjectUrl();
        setPreview(null);
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      setBusy(null);
    });
  }

  const uploading = isPending && busy === "upload";

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className="relative">
        <UserAvatar name={name} src={preview} size="xl" priority />
        {uploading && (
          <span aria-hidden="true" className="absolute inset-0 grid place-items-center rounded-full bg-black/45">
            <Loader2 className="size-6 text-white motion-safe:animate-spin" />
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-label="Elegir foto de perfil"
          onChange={onFileChange}
        />
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label="Cambiar foto"
          disabled={isPending}
          onClick={() => inputRef.current?.click()}
          className="absolute -right-1 -bottom-1 size-11 rounded-full shadow-elev-1 ring-4 ring-background pointer-coarse:size-11"
        >
          <Camera className="size-5" aria-hidden="true" />
        </Button>
      </div>
      {preview && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={onRemove}
          className="mt-1 text-muted-foreground"
        >
          Quitar foto
        </Button>
      )}
      <span role="status" className="sr-only">
        {uploading ? "Subiendo foto…" : busy === "remove" ? "Quitando foto…" : ""}
      </span>
    </div>
  );
}
