import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

/*
 * Badge con dos ejes:
 * - `variant` (shadcn) se mantiene por compatibilidad.
 * - `tone` aplica la receta "soft" (fondo 14 %, texto del color, anillo 25 %)
 *   y, cuando está presente, reemplaza los colores del variant.
 * - `size` sm (h-5, text-2xs) o md (h-6, text-xs; por defecto).
 */
const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default:
          "bg-primary-solid text-primary-foreground [a]:hover:brightness-110",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive dark:bg-destructive/20 [a]:hover:bg-destructive/20",
        outline:
          "border-hairline text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      tone: {
        neutral: "bg-white/6 text-foreground ring-1 ring-hairline ring-inset",
        primary: "bg-primary/14 text-primary ring-1 ring-primary/25 ring-inset",
        success: "bg-success/14 text-success ring-1 ring-success/25 ring-inset",
        destructive:
          "bg-destructive/14 text-destructive ring-1 ring-destructive/25 ring-inset",
        warning: "bg-warning/14 text-warning ring-1 ring-warning/25 ring-inset",
        gold: "bg-gold/14 text-gold ring-1 ring-gold/25 ring-inset",
      },
      size: {
        sm: "h-5 px-1.5 text-2xs font-semibold",
        md: "h-6 px-2 text-xs font-medium",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

function Badge({
  className,
  variant = "default",
  tone,
  size = "md",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      data-tone={tone ?? undefined}
      data-size={size}
      className={cn(
        // Con tone, el variant no aporta colores (null desactiva el default).
        badgeVariants({ variant: tone ? null : variant, tone, size }),
        className
      )}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
