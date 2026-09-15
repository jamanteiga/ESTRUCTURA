-- ============================================================
-- OPCIONAL — solo si quieres limpiar la base de datos.
-- La app ya NO usa nada de esto (se quitó el modal "📄 Documentación
-- de la pieza" de arbol.html a favor de los nodos MOD/PDC/WIN reales).
-- No hace falta ejecutar este archivo para que nada funcione.
--
-- OJO: esto borra para siempre cualquier dato que hubiera quedado
-- marcado con el modal antiguo (Publicado/Fecha subida por pieza).
-- Si no te importa perderlo, ejecuta este archivo entero.
-- ============================================================

drop function if exists public.marcar_documentacion_pieza(uuid, text, boolean, date);
drop function if exists public.listar_documentacion_nodo(uuid);
drop table if exists public.node_documentacion;
