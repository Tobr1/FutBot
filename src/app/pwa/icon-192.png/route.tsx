import { ImageResponse } from "next/og";
import { AppIconArt } from "@/components/brand/app-icon-art";

/** Ícono 192px del manifest. Sin APIs de request: se prerenderiza en el build. */
export function GET() {
  return new ImageResponse(<AppIconArt size={192} variant="any" />, { width: 192, height: 192 });
}
