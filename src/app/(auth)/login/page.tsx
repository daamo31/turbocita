import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "./actions";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, info } = await searchParams;
  const err = typeof error === "string" ? error : null;
  const note = typeof info === "string" ? info : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-4">
      <Link href="/" className="text-2xl font-bold tracking-tight">TurboCita</Link>
      {err && <p className="w-full rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">{err}</p>}
      {note && <p className="w-full rounded-md bg-green-600/10 px-4 py-2 text-sm text-green-700">{note}</p>}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Iniciar sesión</CardTitle>
          <CardDescription>Accede al panel de tu negocio</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signIn} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="e1">Email</Label><Input id="e1" name="email" type="email" autoComplete="email" required /></div>
            <div className="space-y-2"><Label htmlFor="p1">Contraseña</Label><Input id="p1" name="password" type="password" autoComplete="current-password" required /></div>
            <Button type="submit" className="w-full">Entrar</Button>
          </form>
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">
        ¿Aún no tienes cuenta? <Link href="/registro" className="font-medium text-foreground underline">Crea tu negocio</Link>
      </p>
    </main>
  );
}
