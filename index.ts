// supabase/functions/admin-create-user/index.ts
//
// Crea un usuario nuevo (auth.users + profiles) sin contraseña.
// Solo puede invocarla un usuario cuyo perfil tenga rol = 'ADMIN'.
//
// Body esperado (JSON):
//   { "email": "...", "nombre_completo": "...", "rol": "TRABAJADOR" | "REVISOR" | "ADMIN" }
//
// Respuesta 200: { "perfil": { id, email, nombre_completo, rol, activo, ... } }
// Respuesta 4xx/5xx: { "error": "..." }

import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const ROLES_VALIDOS = ["TRABAJADOR", "REVISOR", "ADMIN"];

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Método no permitido" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Falta cabecera de autorización" }, 401);
    }

    // Cliente "en nombre de quien llama": para comprobar que es ADMIN,
    // usando su propio token, no la service role key.
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
      return jsonResponse({ error: "Solo un ADMIN activo puede crear usuarios" }, 403);
    }

    const body = await req.json().catch(() => null);
    const email = body?.email?.trim();
    const nombreCompleto = body?.nombre_completo?.trim();
    const rol = body?.rol;

    if (!email || !nombreCompleto || !rol) {
      return jsonResponse(
        { error: "Faltan campos obligatorios: email, nombre_completo, rol" },
        400
      );
    }
    if (!ROLES_VALIDOS.includes(rol)) {
      return jsonResponse(
        { error: `Rol inválido. Debe ser uno de: ${ROLES_VALIDOS.join(", ")}` },
        400
      );
    }

    // Cliente con la service role key: puede crear usuarios en Auth
    // y saltarse RLS para insertar el perfil.
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: nuevoUsuario, error: crearError } = await adminClient.auth.admin.createUser({
      email,
      email_confirm: true, // no hace falta que confirme el correo: entrará por Magic Link
    });

    if (crearError || !nuevoUsuario?.user) {
      return jsonResponse(
        { error: crearError?.message ?? "No se pudo crear el usuario en Auth" },
        400
      );
    }

    const { data: nuevoPerfil, error: perfilInsertError } = await adminClient
      .from("profiles")
      .insert({
        id: nuevoUsuario.user.id,
        email,
        nombre_completo: nombreCompleto,
        rol,
        activo: true,
      })
      .select()
      .single();

    if (perfilInsertError) {
      // Si falla el perfil, revertimos el usuario de Auth para no
      // dejar una cuenta huérfana sin perfil asociado.
      await adminClient.auth.admin.deleteUser(nuevoUsuario.user.id);
      return jsonResponse({ error: perfilInsertError.message }, 400);
    }

    return jsonResponse({ perfil: nuevoPerfil }, 200);
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
