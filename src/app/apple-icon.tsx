import { ImageResponse } from "next/og";
import { AppIconArt } from "@/components/brand/app-icon-art";

/** Ícono de "Agregar a inicio" en iOS: cuadrado opaco, iOS redondea las esquinas. */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<AppIconArt size={size.width} variant="apple" />, size);
}
