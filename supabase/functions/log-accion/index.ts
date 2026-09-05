// supabase/functions/log-accion/index.ts
//
// Registra una línea de actividad en audit_log. La llama cualquier
// usuario autenticado (no solo ADMIN) desde el propio navegador,
// cada vez que hace algo relevante en la app.
//
// La IP y el user-agent se leen de las cabeceras de la petición en
// el servidor, no de lo que diga el cliente — así no se pueden
// falsear. El actor (quién lo hizo) se saca del token de sesión,
// tampoco del body, por el mismo motivo.
//
// Body esperado (JSON):
//   {
//     "accion": "EMPEZAR_TAREA",      (obligatorio, código corto)
//     "descripcion": "Empezó NL801",  (obligatorio, texto legible)
//     "node_id": "uuid-opcional"      (opcional)
//   }
//
// Respuesta 200: { "ok": true }

import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function obtenerIpReal(req: Request): string {
  // x-forwarded-for puede traer varias IPs separadas por coma
  // (proxies intermedios); la primera es la del cliente original.
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "desconocida";
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Método no permitido" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Falta cabecera de autorización" }, 401);
    }

    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData?.user) {
      return jsonResponse({ error: "Token inválido o caducado" }, 401);
    }

    const { data: perfil } = await callerClient
      .from("profiles")
      .select("nombre_completo")
      .eq("id", userData.user.id)
      .single();

    const body = await req.json().catch(() => null);
    const accion: string | undefined = body?.accion;
    const descripcion: string | undefined = body?.descripcion;
    const nodeId: string | null = body?.node_id || null;

    if (!accion || !descripcion) {
      return jsonResponse({ error: "Faltan los campos accion y/o descripcion" }, 400);
    }

    const ip = obtenerIpReal(req);
    const userAgent = req.headers.get("user-agent") || "desconocido";

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { error: insertError } = await adminClient.from("audit_log").insert({
      actor_id: userData.user.id,
      actor_nombre: perfil?.nombre_completo || null,
      accion,
      node_id: nodeId,
      descripcion,
      ip,
      user_agent: userAgent,
    });

    if (insertError) {
      return jsonResponse({ error: insertError.message }, 400);
    }

    return jsonResponse({ ok: true }, 200);
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
