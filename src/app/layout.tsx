import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import { OfflineBanner } from "@/components/layout/offline-banner";
import { MotionProvider } from "@/components/motion/motion-provider";
import { Toaster } from "@/components/ui/sonner";
import { BRAND, BRAND_DESCRIPTION } from "@/lib/brand";
import { getSiteUrl } from "@/lib/env";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Barlow solo para display y números: 700 y 800.
const barlow = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: BRAND.name,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND_DESCRIPTION,
  applicationName: BRAND.name,
  appleWebApp: {
    capable: true,
    title: BRAND.name,
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  openGraph: {
    siteName: BRAND.name,
    locale: "es_AR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

// Sin maximumScale ni userScalable: el zoom queda habilitado (accesibilidad).
export const viewport: Viewport = {
  themeColor: BRAND.bg,
  colorScheme: "dark",
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`dark ${inter.variable} ${barlow.variable} h-full`}>
      <body className="min-h-full">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-[calc(var(--safe-top)+8px)] focus:left-4 focus:z-[60] focus:rounded-lg focus:bg-primary-solid focus:px-4 focus:py-3 focus:font-semibold focus:text-primary-foreground"
        >
          Saltar al contenido
        </a>
        <MotionProvider>{children}</MotionProvider>
        <OfflineBanner />
        <Toaster
          position="bottom-center"
          offset={{ bottom: 24 }}
          mobileOffset={{ bottom: "var(--float-bottom)" }}
          duration={3000}
        />
      </body>
    </html>
  );
}
