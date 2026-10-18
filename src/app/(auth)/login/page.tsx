import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp } from "./actions";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const msg = typeof error === "string" ? error : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-6 p-4">
      {msg && <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">{msg}</p>}
      <div className="grid w-full gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Iniciar sesión</CardTitle>
            <CardDescription>Accede a tu panel</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={signIn} className="space-y-4">
              <div className="space-y-2"><Label htmlFor="e1">Email</Label><Input id="e1" name="email" type="email" required /></div>
              <div className="space-y-2"><Label htmlFor="p1">Contraseña</Label><Input id="p1" name="password" type="password" required /></div>
              <Button type="submit" className="w-full">Entrar</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Crear negocio</CardTitle>
            <CardDescription>Regístrate y empieza a recibir reservas</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={signUp} className="space-y-4">
              <div className="space-y-2"><Label htmlFor="bn">Nombre del negocio</Label><Input id="bn" name="business_name" required /></div>
              <div className="space-y-2"><Label htmlFor="bs">Enlace de reservas</Label><Input id="bs" name="business_slug" placeholder="mi-peluqueria" required /></div>
              <div className="space-y-2"><Label htmlFor="e2">Email</Label><Input id="e2" name="email" type="email" required /></div>
              <div className="space-y-2"><Label htmlFor="p2">Contraseña</Label><Input id="p2" name="password" type="password" minLength={8} required /></div>
              <Button type="submit" variant="secondary" className="w-full">Registrarme</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
