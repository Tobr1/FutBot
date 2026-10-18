import { describe, expect, it } from "vitest"

import { cn } from "./utils"

describe("cn", () => {
  it("keeps custom font sizes next to a text color", () => {
    expect(cn("font-display text-stat", "text-gold")).toBe("font-display text-stat text-gold")
    expect(cn("text-stat-xl text-success")).toBe("text-stat-xl text-success")
    expect(cn("text-display-lg", "text-primary")).toBe("text-display-lg text-primary")
    expect(cn("text-2xs text-muted-foreground")).toBe("text-2xs text-muted-foreground")
  })

  it("still resolves conflicts between font sizes", () => {
    expect(cn("text-sm", "text-display-md")).toBe("text-display-md")
    expect(cn("text-display-xl", "text-stat")).toBe("text-stat")
  })

  it("keeps custom shadows next to a shadow color", () => {
    expect(cn("shadow-glow", "shadow-primary/30")).toBe("shadow-glow shadow-primary/30")
    expect(cn("shadow-sm", "shadow-elev-2")).toBe("shadow-elev-2")
  })

  it("resolves custom easing and animation conflicts", () => {
    expect(cn("ease-out", "ease-out-quint")).toBe("ease-out-quint")
    expect(cn("animate-pulse", "animate-rise")).toBe("animate-rise")
  })

  it("keeps clsx semantics", () => {
    expect(cn("px-2", false, { "py-1": true, hidden: false }, ["px-4"])).toBe("py-1 px-4")
  })
})
