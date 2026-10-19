import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Derecho de acceso/portabilidad: descarga todos los datos de un cliente en JSON.
// RLS limita la consulta a los clientes del negocio del usuario autenticado.
export async function GET(_req: Request, { params }: RouteContext<"/dashboard/clientes/[id]/export">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: client } = await supabase
    .from("clients")
    .select("name, phone, email, notes, created_at, privacy_consent_at, privacy_consent_version")
    .eq("id", id).maybeSingle();
  if (!client) return new NextResponse("Not found", { status: 404 });

  const [{ data: appointments }, { data: loyalty }] = await Promise.all([
    supabase.from("appointments").select("starts_at, ends_at, status, notes, appointment_services(name, price, duration_min)").eq("client_id", id).order("starts_at"),
    supabase.from("client_loyalty_cards").select("current_stamps, rewards_available, total_rewards_earned").eq("client_id", id),
  ]);

  return new NextResponse(JSON.stringify({ client, appointments, loyalty }, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="datos-cliente.json"',
      "Cache-Control": "no-store",
    },
  });
}
