import { ImageResponse } from "next/og";
import { AppIconArt } from "@/components/brand/app-icon-art";

/** Ícono 512px del manifest. Sin APIs de request: se prerenderiza en el build. */
export function GET() {
  return new ImageResponse(<AppIconArt size={512} variant="any" />, { width: 512, height: 512 });
}
