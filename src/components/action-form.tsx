"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Result = void | { ok?: boolean; message?: string; error?: string } | Record<string, unknown>;

interface ActionFormProps extends Omit<React.ComponentProps<"form">, "action"> {
  action: (formData: FormData) => Promise<Result> | Result;
  /** Mensaje del toast cuando la acción termina bien */
  success: string;
  /** Si es true, el formulario se vacía tras guardar */
  resetOnSuccess?: boolean;
}

const isRedirect = (e: unknown) =>
  typeof e === "object" && e !== null && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT");

// Formulario con confirmación visual: toast de éxito/error tras ejecutar la server action.
export function ActionForm({ action, success, resetOnSuccess, children, ...props }: ActionFormProps) {
  const ref = useRef<HTMLFormElement>(null);
  async function run(formData: FormData) {
    try {
      const res = (await action(formData)) as { ok?: boolean; message?: string; error?: string } | undefined;
      if (res && typeof res === "object" && (res.ok === false || res.error)) {
        toast.error(res.error ?? res.message ?? "No se pudo completar la acción");
        return;
      }
      toast.success(res && typeof res === "object" && typeof res.message === "string" ? res.message : success);
      if (resetOnSuccess) ref.current?.reset();
    } catch (e) {
      if (isRedirect(e)) {
        toast.success(success);
        throw e;
      }
      toast.error("No se pudo completar la acción. Inténtalo de nuevo.");
    }
  }
  return (
    <form
      {...props}
      ref={ref}
      action={run}
    >
      {children}
    </form>
  );
}

// Botón de envío con spinner mientras la acción se ejecuta (debe ir dentro de un <form>).
export function SubmitButton({ children, className, disabled, ...props }: React.ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending} className={cn("transition-all duration-200", className)} {...props}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </Button>
  );
}
