-- ============================================================
-- OPCIONAL — solo si quieres limpiar la base de datos.
-- La app ya NO usa nada de esto (se retiró el modal "✅ Publicación
-- Windchill" de arbol.html a favor de los nodos "Publicar"/"Fichero
-- subido" reales). No hace falta ejecutar este archivo para que
-- nada funcione.
--
-- OJO: esto borra para siempre cualquier dato que hubiera quedado
-- marcado con el modal antiguo. Si no te importa perderlo, ejecuta
-- este archivo entero.
-- ============================================================

drop function if exists public.marcar_publicacion_windchill(uuid, boolean);
drop function if exists public.obtener_publicacion_windchill(uuid);
drop table if exists public.node_windchill_publicacion;
