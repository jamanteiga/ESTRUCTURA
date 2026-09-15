// supabase/functions/admin-reset-password/index.ts
//
// Resetea la contraseña de un usuario YA EXISTENTE (auth.users), generando
// una contraseña nueva aleatoria. Solo puede invocarla un ADMIN activo.
//
// (Corrección: antes este fichero tenía, por un error de copia, el mismo
// contenido que admin-create-user -- es decir, en vez de resetear la
// contraseña de un usuario existente, creaba un usuario NUEVO. Ahora sí
// hace lo que su nombre indica: busca el perfil por user_id y actualiza
// su contraseña en Auth con auth.admin.updateUserById.)
//
// Body esperado (JSON):
//   { "user_id": "uuid-del-perfil-a-resetear" }
//
// Respuesta 200: { "perfil": {...}, "password": "..." }
// La contraseña se devuelve UNA sola vez, en esta respuesta: no se guarda
// en ningún sitio, así que si se pierde hay que volver a resetear.

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

function generarPasswordAleatoria(longitud = 12): string {
  // Sin 0/O ni 1/l/I, para que se pueda copiar/leer a mano sin confusiones.
  const charset = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  const bytes = new Uint8Array(longitud);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => charset[b % charset.length]).join("");
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

    const { data: perfilLlamador, error: perfilError } = await callerClient
      .from("profiles")
      .select("rol, activo")
      .eq("id", userData.user.id)
      .single();

    if (
      perfilError ||
      !perfilLlamador ||
      perfilLlamador.rol !== "ADMIN" ||
      !perfilLlamador.activo
    ) {
      return jsonResponse({ error: "Solo un ADMIN activo puede resetear contraseñas" }, 403);
    }

    const body = await req.json().catch(() => null);
    const userId: string | undefined = body?.user_id;

    if (!userId) {
      return jsonResponse({ error: "Falta el campo obligatorio: user_id" }, 400);
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: perfilObjetivo, error: perfilObjetivoError } = await adminClient
      .from("profiles")
      .select("id, username")
      .eq("id", userId)
      .single();

    if (perfilObjetivoError || !perfilObjetivo) {
      return jsonResponse({ error: "No existe ningún usuario con ese id" }, 404);
    }

    const nuevaPassword = generarPasswordAleatoria();

    const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(userId, {
      password: nuevaPassword,
    });

    if (updateAuthError) {
      return jsonResponse(
        { error: updateAuthError.message ?? "No se pudo actualizar la contraseña en Auth" },
        400
      );
    }

    const { data: perfilActualizado, error: perfilUpdateError } = await adminClient
      .from("profiles")
      .update({ debe_cambiar_password: true })
      .eq("id", userId)
      .select()
      .single();

    // La contraseña ya se cambió en Auth aunque falle esta segunda parte
    // (marcar "debe cambiar contraseña") -- se devuelve igual la nueva
    // contraseña, que es lo importante para el ADMIN que la está reseteando.
    if (perfilUpdateError) {
      return jsonResponse({ perfil: perfilObjetivo, password: nuevaPassword }, 200);
    }

    return jsonResponse({ perfil: perfilActualizado, password: nuevaPassword }, 200);
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
