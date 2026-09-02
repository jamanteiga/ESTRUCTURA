// supabase/functions/admin-create-user/index.ts
//
// Crea un usuario nuevo (auth.users + profiles) con username + contraseña,
// sin usar email real. Solo puede invocarla un ADMIN activo.
//
// Body esperado (JSON):
//   {
//     "username": "jperez",                 (obligatorio, 3-32 car., minúsculas/números/./_/-)
//     "nombre_completo": "Juan Pérez",       (obligatorio)
//     "rol": "TRABAJADOR" | "REVISOR" | "ADMIN",  (obligatorio)
//     "password": "..."                     (opcional; si se omite, se genera una aleatoria)
//   }
//
// Respuesta 200: { "perfil": {...}, "password": "...", "password_generada": true|false }
// La contraseña se devuelve UNA sola vez, en esta respuesta: no vuelve a
// recuperarse en ningún otro sitio, ni siquiera el ADMIN puede verla después.

import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const ROLES_VALIDOS = ["TRABAJADOR", "REVISOR", "ADMIN"];
// .invalid es el TLD reservado (RFC 2606) para direcciones garantizado que
// nunca serán reales ni entregables: exactamente lo que necesitamos aquí.
const DOMINIO_SINTETICO = "estructura.app.invalid";
const REGEX_USERNAME = /^[a-z0-9._-]{3,32}$/;

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
      return jsonResponse({ error: "Solo un ADMIN activo puede crear usuarios" }, 403);
    }

    const body = await req.json().catch(() => null);
    const usernameRaw: string | undefined = body?.username?.trim().toLowerCase();
    const nombreCompleto: string | undefined = body?.nombre_completo?.trim();
    const rol: string | undefined = body?.rol;
    let password: string | undefined = body?.password?.trim();

    if (!usernameRaw || !nombreCompleto || !rol) {
      return jsonResponse(
        { error: "Faltan campos obligatorios: username, nombre_completo, rol" },
        400
      );
    }
    if (!REGEX_USERNAME.test(usernameRaw)) {
      return jsonResponse(
        {
          error:
            "Usuario inválido: solo minúsculas, números, punto, guion y guion bajo (3-32 caracteres)",
        },
        400
      );
    }
    if (!ROLES_VALIDOS.includes(rol)) {
      return jsonResponse(
        { error: `Rol inválido. Debe ser uno de: ${ROLES_VALIDOS.join(", ")}` },
        400
      );
    }

    let passwordGenerada = false;
    if (!password) {
      password = generarPasswordAleatoria();
      passwordGenerada = true;
    } else if (password.length < 8) {
      return jsonResponse({ error: "La contraseña debe tener al menos 8 caracteres" }, 400);
    }

    const emailSintetico = `${usernameRaw}@${DOMINIO_SINTETICO}`;

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: nuevoUsuario, error: crearError } = await adminClient.auth.admin.createUser({
      email: emailSintetico,
      password,
      email_confirm: true,
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
        username: usernameRaw,
        email: emailSintetico,
        nombre_completo: nombreCompleto,
        rol,
        activo: true,
        debe_cambiar_password: true,
      })
      .select()
      .single();

    if (perfilInsertError) {
      // Revertimos el usuario de Auth para no dejar una cuenta huérfana.
      await adminClient.auth.admin.deleteUser(nuevoUsuario.user.id);
      return jsonResponse({ error: perfilInsertError.message }, 400);
    }

    return jsonResponse(
      { perfil: nuevoPerfil, password, password_generada: passwordGenerada },
      200
    );
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});