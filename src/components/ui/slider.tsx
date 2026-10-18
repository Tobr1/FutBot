"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Slider as SliderPrimitive } from "radix-ui"

/*
 * Slider táctil: raíz de 44px de alto (toda la franja es zona de toque),
 * pista de 8px y thumb de 24px (28px en punteros gruesos).
 * Un Thumb por valor; `thumbProps` se aplica a cada uno (aria-label,
 * aria-valuetext, etc.).
 */
function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  rangeClassName,
  thumbProps,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & {
  rangeClassName?: string
  thumbProps?: React.ComponentProps<typeof SliderPrimitive.Thumb>
}) {
  const thumbCount = Array.isArray(value)
    ? value.length
    : Array.isArray(defaultValue)
      ? defaultValue.length
      : 1
  const { className: thumbClassName, ...restThumbProps } = thumbProps ?? {}

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex h-11 w-full touch-none items-center select-none data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative h-2 grow overflow-hidden rounded-full bg-muted"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn("absolute h-full bg-primary", rangeClassName)}
        />
      </SliderPrimitive.Track>
      {Array.from({ length: thumbCount }, (_, index) => (
        <SliderPrimitive.Thumb
          key={index}
          data-slot="slider-thumb"
          // Radix pone etiquetas en inglés ("Minimum"/"Maximum") a los rangos.
          aria-label={
            thumbCount === 2
              ? index === 0
                ? "Mínimo"
                : "Máximo"
              : thumbCount > 2
                ? `Valor ${index + 1} de ${thumbCount}`
                : undefined
          }
          {...restThumbProps}
          className={cn(
            // Tailwind 4 escala con la propiedad `scale`, por eso se transiciona.
            "block size-6 rounded-full bg-white shadow-[0_2px_8px_oklch(0_0_0/50%)] ring-4 ring-primary/30 transition-[transform,scale,box-shadow] pointer-coarse:size-7 active:scale-110 focus-visible:ring-ring focus-visible:outline-none",
            thumbClassName
          )}
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
