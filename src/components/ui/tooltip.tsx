"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { cn } from "@/lib/utils";

// Tooltip accesible: el hijo (un único elemento) actúa como disparador.
export function Tip({ label, children, side = "bottom" }: { label: string; children: React.ReactElement<Record<string, unknown>>; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <TooltipPrimitive.Provider delay={300}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger render={children} />
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Positioner side={side} sideOffset={6} className="z-50">
            <TooltipPrimitive.Popup
              className={cn(
                "rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-md",
                "origin-(--transform-origin) transition-[opacity,transform] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0"
              )}
            >
              {label}
            </TooltipPrimitive.Popup>
          </TooltipPrimitive.Positioner>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
