"use client";

import { Button } from "@/components/ui/button";

// Botón de envío que pide confirmación antes de ejecutar la acción del formulario
export function ConfirmButton({ message, children }: { message: string; children: React.ReactNode }) {
  return (
    <Button type="submit" size="xs" variant="outline" className="text-destructive"
      onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}>
      {children}
    </Button>
  );
}
