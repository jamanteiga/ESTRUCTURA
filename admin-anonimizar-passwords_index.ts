// supabase/functions/admin-anonimizar-passwords/index.ts
//
// Función de USO PUNTUAL para el proceso de anonimización: pone la
// contraseña "12345678" a TODOS los usuarios activos e inactivos,
// EXCEPTO los de username "jamanteiga" y "jmanteiga" (esos dos quedan
// exactamente igual que están ahora). Solo puede invocarla un ADMIN activo.
//
// No hace falta llamarla más de una vez. Una vez ejecutada y comprobado
// el resultado, esta función se puede borrar de Supabase si se quiere
// (Dashboard -> Edge Functions -> admin-anonimizar-passwords -> Delete).
//
// Body esperado: {} (no necesita nada, se aplica a todos los usuarios
// menos los excluidos).
//
// Respuesta 200: {
//   "actualizados": <número de cuentas cambiadas>,
//   "omitidos": ["jamanteiga", "jmanteiga"],
//   "errores": [ { "username": "...", "error": "..." }, ... ]
// }

import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const PASSWORD_NUEVA = "12345678";
const USERNAMES_EXCLUIDOS = ["jamanteiga", "jmanteiga"];

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
      return jsonResponse({ error: "Solo un ADMIN activo puede ejecutar esto" }, 403);
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: perfiles, error: perfilesError } = await adminClient
      .from("profiles")
      .select("id, username");

    if (perfilesError || !perfiles) {
      return jsonResponse(
        { error: perfilesError?.message ?? "No se pudieron leer los perfiles" },
        400
      );
    }

    const objetivos = perfiles.filter((p) => !USERNAMES_EXCLUIDOS.includes(p.username));
    const omitidos = perfiles
      .filter((p) => USERNAMES_EXCLUIDOS.includes(p.username))
      .map((p) => p.username);

    const errores: { username: string; error: string }[] = [];
    let actualizados = 0;

    for (const perfil of objetivos) {
      const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(perfil.id, {
        password: PASSWORD_NUEVA,
      });
      if (updateAuthError) {
        errores.push({ username: perfil.username, error: updateAuthError.message });
        continue;
      }
      // Contraseña compartida y conocida de antemano -- no forzamos a
      // cambiarla en el primer login (a diferencia del reseteo individual,
      // que sí genera una contraseña aleatoria de un solo uso).
      await adminClient
        .from("profiles")
        .update({ debe_cambiar_password: false })
        .eq("id", perfil.id);
      actualizados++;
    }

    return jsonResponse({ actualizados, omitidos, errores }, 200);
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
