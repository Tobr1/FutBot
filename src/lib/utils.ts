import { createCn } from "cn/config"

/**
 * Class merger (clsx + tailwind-merge semantics) extended with the project's
 * custom theme tokens from globals.css. Without this, `text-stat`,
 * `text-display-*` and `shadow-elev-*`/`shadow-glow` would be read as COLOR
 * utilities and silently dropped next to any `text-*`/`shadow-*` color.
 *
 * Every component must import `cn` from here (never from "cn" directly).
 */
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["2xs", "display-xl", "display-lg", "display-md", "stat", "stat-xl"] },
      ],
      shadow: [{ shadow: ["elev-1", "elev-2", "glow"] }],
      ease: [{ ease: ["out-quint", "in-out-quart"] }],
      animate: [{ animate: ["rise"] }],
    },
  },
})
