import { ImageResponse } from "next/og";
import { AppIconArt } from "@/components/brand/app-icon-art";

/** Ícono maskable 512px (Android recorta a círculo, gota o squircle). Prerenderizado. */
export function GET() {
  return new ImageResponse(<AppIconArt size={512} variant="maskable" />, { width: 512, height: 512 });
}
