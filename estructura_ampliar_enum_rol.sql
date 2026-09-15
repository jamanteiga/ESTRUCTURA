-- ============================================================
-- profiles.rol usa el tipo enum "user_role", que solo admite los
-- valores con los que se creó originalmente. Al intentar crear un
-- usuario con rol WINDCHILL (o INVITADO, si tampoco se llegó a
-- añadir en su día) Postgres lo rechaza con:
--   invalid input value for enum user_role: "WINDCHILL"
-- Esto amplía el enum para admitir ambos. No hace nada si ya
-- estuvieran añadidos (IF NOT EXISTS).
--
-- IMPORTANTE: ejecutar este bloque SOLO, sin combinarlo con otras
-- consultas en el mismo "Run" del editor SQL de Supabase — Postgres
-- no permite usar un valor de enum recién añadido dentro de la
-- misma transacción en la que se añadió.
-- ============================================================

alter type public.user_role add value if not exists 'INVITADO';
alter type public.user_role add value if not exists 'WINDCHILL';
