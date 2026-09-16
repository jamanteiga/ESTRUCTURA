-- ============================================================================
-- Quita del todo el "Checklist de calidad" (tablas, funciones y el trigger
-- que bloqueaba aprobar una tarea si no estaba todo marcado).
-- ============================================================================
-- Ejecutar en Supabase → SQL Editor. No toca ningún enum, se ejecuta entera
-- de una vez.
--
-- IMPORTANTE: además de quitar el aviso/ventana de árbol.html (ya hecho en
-- el código), esto es imprescindible. Había un trigger en node_workflow
-- (validar_checklist_calidad) que impedía aprobar CUALQUIER tarea -- desde
-- árbol, resumen, kanban o aprobación masiva -- si quedaba algún punto del
-- checklist sin marcar. Como ya no queda ninguna pantalla desde la que
-- marcar esos puntos, si llegara a haber algún punto activo configurado, a
-- partir de ahora NINGUNA aprobación funcionaría, con un error confuso
-- ("Faltan N punto(s) del checklist de calidad por marcar..."). Este script
-- quita ese trigger para que aprobar vuelva a funcionar siempre.
-- ============================================================================

drop trigger if exists validar_checklist_calidad on public.node_workflow;
drop function if exists public.trg_validar_checklist_calidad();

drop function if exists public.marcar_checklist_item(uuid, uuid, boolean);
drop function if exists public.listar_checklist_calidad_nodo(uuid);
drop function if exists public.eliminar_item_checklist_calidad(uuid);
drop function if exists public.establecer_activo_item_checklist(uuid, boolean);
drop function if exists public.anadir_item_checklist_calidad(text);

drop table if exists public.node_checklist_calidad;
drop table if exists public.checklist_calidad_items;
