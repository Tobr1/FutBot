"use client";

import { useState } from "react";
import { InstallGuideSheet } from "@/components/pwa/install-guide";
import { Button } from "@/components/ui/button";
import type { InstallGuide } from "@/lib/pwa/platform";

type ManualGuide = Exclude<InstallGuide, "prompt">;

const GUIDES: Array<{ guide: ManualGuide; label: string }> = [
  { guide: "ios-safari", label: "iPhone · Safari" },
  { guide: "ipad-safari", label: "iPad · Safari" },
  { guide: "ios-chrome", label: "iPhone · Chrome" },
  { guide: "ios-other", label: "iPhone · otro navegador" },
  { guide: "in-app-ios", label: "iPhone · Instagram/Facebook" },
  { guide: "in-app-android", label: "Android · WhatsApp" },
  { guide: "android-manual", label: "Android · sin diálogo" },
];

/** Demo: abre la guía de instalación de cada plataforma sin necesitar el dispositivo. */
export function InstallGuidesDemo() {
  const [open, setOpen] = useState<ManualGuide | null>(null);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Guías de instalación por plataforma (en el dispositivo real se elige sola). Android con Chrome abre el diálogo nativo
        directamente, sin guía.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {GUIDES.map(({ guide, label }) => (
          <Button key={guide} type="button" variant="secondary" className="h-auto min-h-11 whitespace-normal" onClick={() => setOpen(guide)}>
            {label}
          </Button>
        ))}
      </div>
      {GUIDES.map(({ guide }) => (
        <InstallGuideSheet key={guide} guide={guide} open={open === guide} onOpenChange={(next) => setOpen(next ? guide : null)} />
      ))}
    </div>
  );
}
