"use client";

import { Download, Loader2, MessageCircle, Share2 } from "lucide-react";
import { useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { whatsappShareUrl } from "@/domain/share/text";
import { cn } from "@/lib/utils";

const noopSubscribe = () => () => {};

/**
 * "Compartir" una imagen generada en el servidor (resultado o ficha) y el
 * texto por WhatsApp. La imagen se pide recién al tocar (con la sesión del
 * usuario: es privada del grupo) y se precarga al apoyar el dedo, así la hoja
 * nativa abre dentro del gesto. Sin `navigator.share` con archivos, se descarga.
 */
export function ShareActions({
  imageUrl,
  fileName,
  title,
  text,
  path,
  className,
}: {
  imageUrl: string;
  fileName: string;
  title: string;
  text: string;
  /** Ruta de la página para el link de WhatsApp (se completa con el origen). */
  path: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<Promise<File> | null>(null);
  const origin = useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "");
  const canShareFiles = useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator.canShare === "function" && typeof navigator.share === "function",
    () => false,
  );

  function loadFile(): Promise<File> {
    if (!fileRef.current) {
      fileRef.current = fetch(imageUrl, { credentials: "same-origin", cache: "no-store" })
        .then(async (res) => {
          const type = res.headers.get("content-type") ?? "";
          if (!res.ok || !type.startsWith("image/")) throw new Error("bad-response");
          return new File([await res.blob()], fileName, { type: "image/png" });
        })
        .catch((error: unknown) => {
          fileRef.current = null;
          throw error;
        });
    }
    return fileRef.current;
  }

  function download(file: File) {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Imagen descargada.");
  }

  async function share() {
    setBusy(true);
    try {
      const file = await loadFile();
      if (canShareFiles && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title, text });
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") return;
          // Algunos navegadores piden un gesto "fresco" después de bajar la imagen: ya quedó lista.
          if (error instanceof Error && error.name === "NotAllowedError") {
            toast("La imagen está lista: tocá Compartir de nuevo.");
            return;
          }
          download(file);
        }
      } else {
        download(file);
      }
    } catch {
      toast.error("No se pudo generar la imagen. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  const ShareIcon = canShareFiles ? Share2 : Download;
  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      <Button
        type="button"
        variant="secondary"
        onPointerDown={() => void loadFile().catch(() => {})}
        onClick={share}
        disabled={busy}
        aria-busy={busy || undefined}
        className="w-full"
      >
        {busy ? <Loader2 className="motion-safe:animate-spin" aria-hidden="true" /> : <ShareIcon aria-hidden="true" />}
        {canShareFiles ? "Compartir" : "Descargar imagen"}
      </Button>
      <Button asChild variant="whatsapp" className="w-full">
        <a href={whatsappShareUrl(text, origin ? `${origin}${path}` : undefined)} target="_blank" rel="noopener noreferrer">
          <MessageCircle aria-hidden="true" />
          WhatsApp
        </a>
      </Button>
    </div>
  );
}
