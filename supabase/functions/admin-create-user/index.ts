// supabase/functions/admin-reset-password/index.ts
//
// Resetea la contraseña de un usuario existente. Solo puede invocarla
// un ADMIN activo. No "recupera" la contraseña anterior (es imposible:
// no se guarda en texto plano) — genera o fija una nueva, y obliga a
// cambiarla en el próximo inicio de sesión.
//
// Body esperado (JSON):
//   {
//     "user_id": "uuid-del-usuario",   (obligatorio)
//     "password": "..."                (opcional; si se omite, se genera una aleatoria)
//   }
//
// Respuesta 200: { "password": "...", "password_generada": true|false }

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
    let password: string | undefined = body?.password?.trim();

    if (!userId) {
      return jsonResponse({ error: "Falta el campo user_id" }, 400);
    }

    let passwordGenerada = false;
    if (!password) {
      password = generarPasswordAleatoria();
      passwordGenerada = true;
    } else if (password.length < 8) {
      return jsonResponse({ error: "La contraseña debe tener al menos 8 caracteres" }, 400);
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(userId, {
      password,
    });

    if (updateAuthError) {
      return jsonResponse({ error: updateAuthError.message }, 400);
    }

    const { error: updatePerfilError } = await adminClient
      .from("profiles")
      .update({ debe_cambiar_password: true })
      .eq("id", userId);

    if (updatePerfilError) {
      return jsonResponse({ error: updatePerfilError.message }, 400);
    }

    return jsonResponse({ password, password_generada: passwordGenerada }, 200);
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});