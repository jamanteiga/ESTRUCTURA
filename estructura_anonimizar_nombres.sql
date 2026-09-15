-- ============================================================
-- No toca ningún enum, se ejecuta entera de una vez (un único Run).
--
-- Anonimiza el NOMBRE VISIBLE (profiles.nombre_completo) de los usuarios.
-- NO toca username ni email (o sea, nadie cambia su forma de iniciar
-- sesión) -- solo el nombre que se ve en pantalla.
--
-- Siempre quedan SIN TOCAR (con su nombre real): los usuarios de
-- username 'jamanteiga' y 'jmanteiga'.
--
-- Antes de tocar nada, esta consulta te enseña qué se va a renombrar --
-- ejecútala primero sola si quieres verlo antes de aplicar el cambio real:
--
--   select username, rol, nombre_completo from public.profiles
--   where username not in ('jamanteiga', 'jmanteiga')
--   order by rol, username;
-- ============================================================

-- 1) Trabajadores -> "Usuario 1", "Usuario 2", ... (numerados por
--    username, para que el orden sea siempre el mismo si se repite).
with numerados as (
  select id, row_number() over (order by username) as n
  from public.profiles
  where rol = 'TRABAJADOR'
    and username not in ('jamanteiga', 'jmanteiga')
)
update public.profiles p
set nombre_completo = 'Usuario ' || numerados.n
from numerados
where p.id = numerados.id;

-- 2) Supervisor César -> "Supervisor 1"
update public.profiles
set nombre_completo = 'Supervisor 1'
where rol = 'REVISOR'
  and username not in ('jamanteiga', 'jmanteiga')
  and (nombre_completo ilike '%césar%' or nombre_completo ilike '%cesar%');

-- 3) Supervisor Jesús -> "Supervisor 2"
update public.profiles
set nombre_completo = 'Supervisor 2'
where rol = 'REVISOR'
  and username not in ('jamanteiga', 'jmanteiga')
  and (nombre_completo ilike '%jesús%' or nombre_completo ilike '%jesus%');

-- Si hubiera algún otro REVISOR además de César y Jesús, no se toca aquí
-- (no se mencionó en la lista) -- dime el nombre si también quieres
-- anonimizarlo y añado la línea.

-- 4) Usuario de Windchill -> "windchilluser1"
update public.profiles
set nombre_completo = 'windchilluser1'
where rol = 'WINDCHILL'
  and username not in ('jamanteiga', 'jmanteiga');
