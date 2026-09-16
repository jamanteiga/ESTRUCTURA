-- ============================================================================
-- Hace que el menú lateral "fijo" (pegado a la izquierda, sin tener que
-- desplegarlo) sea el comportamiento por defecto en árbol.html.
-- ============================================================================
-- Ejecutar en Supabase → SQL Editor. No toca ningún enum, se ejecuta entera
-- de una vez.
--
-- El código de arbol.html ya se ha cambiado para tratar cualquier perfil sin
-- preferencia explícita (menu_fijo = null) como "fijo". Esta parte de aquí
-- solo hace falta si la columna profiles.menu_fijo tenía "false" puesto por
-- defecto (en vez de null) -- en ese caso, para alguien que nunca ha tocado
-- el interruptor, valdría "false" y se seguiría viendo como "desplegable"
-- aunque ahora el código prefiera "fijo".
-- ============================================================================

-- 1) A partir de ahora, cualquier perfil nuevo arranca en modo fijo.
alter table public.profiles alter column menu_fijo set default true;

-- 2) Para los perfiles que ya existen y todavía no tienen preferencia
--    guardada (null), los pone en fijo también. Esto es seguro: no toca a
--    nadie que ya haya elegido explícitamente "desplegable" o "fijo" desde
--    el menú.
update public.profiles set menu_fijo = true where menu_fijo is null;

-- 3) OPCIONAL -- descomentar solo si además quieres que TODO el mundo
--    arranque en modo fijo a partir de ahora, incluida la gente que ya
--    había elegido "desplegable" alguna vez (por ejemplo, si esa elección
--    se hizo sin darse cuenta, antes de que el menú tuviera esta opción
--    bien explicada). Esto sí sobrescribe una elección explícita anterior.
-- update public.profiles set menu_fijo = true;
