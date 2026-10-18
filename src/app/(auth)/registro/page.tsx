import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignupForm } from "../login/signup-form";

export default async function RegisterPage({ searchParams }: PageProps<"/registro">) {
  const { error } = await searchParams;
  const err = typeof error === "string" ? error : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-4">
      <Link href="/" className="text-2xl font-bold tracking-tight">TurboCita</Link>
      {err && <p className="w-full rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">{err}</p>}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Crea tu negocio</CardTitle>
          <CardDescription>Gratis para empezar. Tus clientes podrán reservar en minutos.</CardDescription>
        </CardHeader>
        <CardContent>
          <SignupForm rootDomain={process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? null} />
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">
        ¿Ya tienes cuenta? <Link href="/login" className="font-medium text-foreground underline">Inicia sesión</Link>
      </p>
    </main>
  );
}
